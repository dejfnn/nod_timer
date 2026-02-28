import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  TimerDisplay,
  Card,
  Input,
  Badge,
  EmptyState,
  SectionHeader,
  EntryCard,
  GradientButton,
} from "@/components/ui";
import { ProjectPicker } from "@/components/ProjectPicker";
import { TagPicker } from "@/components/TagPicker";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import { RunningTotal } from "@/components/RunningTotal";
import { useTimer } from "@/hooks/useTimer";
import { db } from "@/db/client";
import { getAllTimeEntries, deleteTimeEntry, getTagsForEntry } from "@/models/timeEntry";
import { getProjectById } from "@/models/project";
import { getTodayRange, formatDuration } from "@/utils/time";
import type { TimeEntry, Project, Tag } from "@/types";

/** Enriched entry with project and tags for display. */
interface DisplayEntry {
  entry: TimeEntry;
  project: Project | null;
  tags: Tag[];
}

const TimerScreen = () => {
  const timer = useTimer();

  // Local UI state
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Today's entries
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);

  // Sync local description from store when resuming
  useEffect(() => {
    if (timer.isRunning) {
      setDescription(timer.description);
      setProjectId(timer.projectId);
      if (timer.projectId) {
        getProjectById(db, timer.projectId).then((p) => setProject(p ?? null));
      }
      setTagIds(timer.tagIds);
    }
  }, [timer.isRunning, timer.activeEntryId]);

  // Load today's entries
  const loadEntries = useCallback(async () => {
    try {
      const allEntries = await getAllTimeEntries(db);
      const { start, end } = getTodayRange();

      // Filter to today's completed entries
      const todayEntries = allEntries.filter((e) => {
        return e.startTime >= start && e.startTime <= end && e.stopTime !== null;
      });

      // Sort by start time descending (newest first)
      todayEntries.sort((a, b) => b.startTime.localeCompare(a.startTime));

      // Enrich with project and tags
      const enriched: DisplayEntry[] = await Promise.all(
        todayEntries.map(async (entry) => {
          const entryProject = entry.projectId
            ? (await getProjectById(db, entry.projectId)) ?? null
            : null;
          const entryTags = await getTagsForEntry(db, entry.id);
          return { entry, project: entryProject, tags: entryTags };
        }),
      );

      setEntries(enriched);

      // Calculate today's total
      const total = todayEntries.reduce(
        (sum, e) => sum + (e.durationSeconds ?? 0),
        0,
      );
      setTodayTotal(total);
    } catch (e) {
      console.error("Failed to load entries:", e);
    }
  }, []);

  // Reload entries on mount and when timer stops
  useEffect(() => {
    loadEntries();
  }, [loadEntries, timer.isRunning]);

  // Timer actions
  const handleStart = async () => {
    await timer.startTimer(description, projectId, tagIds);
  };

  const handleStop = async () => {
    await timer.stopTimer();
    setDescription("");
    setProjectId(null);
    setProject(null);
    setTagIds([]);
    // Reload entries after stopping
    setTimeout(loadEntries, 100);
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (timer.isRunning) {
      timer.updateRunning({ description: text });
    }
  };

  const handleProjectSelect = async (id: number | null) => {
    setProjectId(id);
    if (id) {
      const p = await getProjectById(db, id);
      setProject(p ?? null);
    } else {
      setProject(null);
    }
    if (timer.isRunning) {
      timer.updateRunning({ projectId: id });
    }
  };

  const handleTagSelect = (ids: number[]) => {
    setTagIds(ids);
    if (timer.isRunning) {
      timer.updateRunning({ tagIds: ids });
    }
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteTimeEntry(db, id);
    loadEntries();
  };

  // Running total includes the current running timer
  const runningTotal = timer.isRunning
    ? todayTotal + timer.elapsedSeconds
    : todayTotal;

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.entry.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Timer display card */}
            <View className="px-screen-x pt-4 pb-2">
              <Card
                variant="surface"
                className="items-center py-8"
                style={
                  timer.isRunning
                    ? {
                        borderColor: "#00d4aa",
                        borderWidth: 1,
                      }
                    : undefined
                }
              >
                {/* Status indicator */}
                <View className="flex-row items-center mb-4">
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{
                      backgroundColor: timer.isRunning
                        ? "#2ecc71"
                        : "#5a6270",
                    }}
                  />
                  <Text
                    className={`text-xs font-semibold uppercase ${
                      timer.isRunning ? "text-success" : "text-txt-muted"
                    }`}
                    style={{ letterSpacing: 2 }}
                  >
                    {timer.isRunning ? "TRACKING" : "READY"}
                  </Text>
                </View>

                {/* Timer digits */}
                <TimerDisplay
                  elapsedSeconds={timer.elapsedSeconds}
                  isRunning={timer.isRunning}
                  size="xl"
                />
              </Card>
            </View>

            {/* Description input */}
            <View className="px-screen-x pb-3">
              <Input
                placeholder="What are you working on?"
                value={description}
                onChangeText={handleDescriptionChange}
                iconLeft={
                  <Ionicons name="document-text-outline" size={16} color="#5a6270" />
                }
              />
            </View>

            {/* Project + Tag selectors */}
            <View className="flex-row px-screen-x pb-3 gap-2">
              <Pressable
                onPress={() => setShowProjectPicker(true)}
                className="flex-row items-center bg-tf-card border border-tf-border rounded-xl px-3 py-2.5"
              >
                <View
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{
                    backgroundColor: project?.color ?? "#5a6270",
                  }}
                />
                <Text className="text-txt-secondary text-sm">
                  {project?.name ?? "Project"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#5a6270"
                  style={{ marginLeft: 4 }}
                />
              </Pressable>

              <Pressable
                onPress={() => setShowTagPicker(true)}
                className="flex-row items-center bg-tf-card border border-tf-border rounded-xl px-3 py-2.5"
              >
                <Ionicons name="pricetag-outline" size={14} color="#5a6270" />
                <Text className="text-txt-secondary text-sm ml-1.5">
                  {tagIds.length > 0 ? `${tagIds.length} tags` : "Tags"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#5a6270"
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
            </View>

            {/* Tag badges (when selected) */}
            {tagIds.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 px-screen-x pb-3">
                {tagIds.map((id) => (
                  <Badge key={id} label={`Tag #${id}`} variant="active" size="sm" />
                ))}
              </View>
            )}

            {/* Start / Stop button */}
            <View className="px-screen-x pb-4">
              {timer.isRunning ? (
                <GradientButton
                  variant="stop"
                  label="STOP"
                  onPress={handleStop}
                  icon={<Ionicons name="stop" size={18} color="#ffffff" />}
                />
              ) : (
                <GradientButton
                  variant="start"
                  label="START"
                  onPress={handleStart}
                  icon={<Ionicons name="play" size={18} color="#0a0e1a" />}
                />
              )}
            </View>

            {/* Running info bar (when timer is running) */}
            {timer.isRunning && (
              <View className="px-screen-x pb-4">
                <Card variant="elevated" className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-txt-primary text-sm font-medium"
                      numberOfLines={1}
                    >
                      {timer.description || "No description"}
                    </Text>
                    {project && (
                      <Badge
                        label={project.name}
                        variant="custom"
                        color={project.color}
                        dot
                        size="sm"
                        className="mt-1"
                      />
                    )}
                  </View>
                  <Text
                    className="text-accent text-sm font-mono font-bold"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatDuration(timer.elapsedSeconds)}
                  </Text>
                </Card>
              </View>
            )}

            {/* Manual entry form */}
            <ManualEntryForm onEntryCreated={loadEntries} />

            {/* Today's entries header */}
            <SectionHeader
              title="Today's Entries"
              right={
                <Text className="text-txt-muted text-xs">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </Text>
              }
              className="mt-2"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-screen-x mb-2">
            <EntryCard
              entry={item.entry}
              project={item.project}
              tags={item.tags}
              onDelete={handleDeleteEntry}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="time-outline" size={48} color="#5a6270" />}
            title="No entries today"
            description="Start tracking time or add a manual entry to see your work here."
          />
        }
      />

      {/* Running total bar at bottom */}
      <RunningTotal totalSeconds={runningTotal} />

      {/* Modals */}
      <ProjectPicker
        selectedId={projectId}
        onSelect={handleProjectSelect}
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
      />
      <TagPicker
        selectedIds={tagIds}
        onSelect={handleTagSelect}
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
      />
    </SafeAreaView>
  );
};

export default TimerScreen;
