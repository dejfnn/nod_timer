import { useState } from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Input, Button, Badge } from "@/components/ui";
import { ProjectPicker } from "./ProjectPicker";
import { TagPicker } from "./TagPicker";
import { db } from "@/db/client";
import { createTimeEntry, addTags } from "@/models/timeEntry";
import { getProjectById } from "@/models/project";
import { diffSeconds, nowISO } from "@/utils/time";
import type { Project } from "@/types";

/**
 * Collapsible manual time entry form.
 * Allows entering description, project, tags, date, start time, and end time.
 */

interface ManualEntryFormProps {
  /** Called after a manual entry is successfully created */
  onEntryCreated?: () => void;
}

export const ManualEntryForm = ({ onEntryCreated }: ManualEntryFormProps) => {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [date, setDate] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setDescription("");
    setProjectId(null);
    setProject(null);
    setTagIds([]);
    setStartTime("");
    setEndTime("");
    setDate("");
    setError(null);
  };

  const handleProjectSelect = async (id: number | null) => {
    setProjectId(id);
    if (id) {
      const p = await getProjectById(db, id);
      setProject(p ?? null);
    } else {
      setProject(null);
    }
  };

  const validate = (): boolean => {
    if (!startTime || !endTime) {
      setError("Start time and end time are required.");
      return false;
    }

    // Build full ISO strings
    const dateStr = date || nowISO().split("T")[0];
    const start = `${dateStr}T${startTime}:00`;
    const end = `${dateStr}T${endTime}:00`;

    const duration = diffSeconds(start, end);
    if (duration <= 0) {
      setError("End time must be after start time.");
      return false;
    }
    if (duration > 86400) {
      setError("Duration cannot exceed 24 hours.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const dateStr = date || nowISO().split("T")[0];
      const start = `${dateStr}T${startTime}:00`;
      const end = `${dateStr}T${endTime}:00`;
      const duration = diffSeconds(start, end);

      const entry = await createTimeEntry(db, {
        description,
        projectId: projectId ?? undefined,
        startTime: start,
        stopTime: end,
        durationSeconds: duration,
      });

      if (tagIds.length > 0) {
        await addTags(db, entry.id, tagIds);
      }

      resetForm();
      setExpanded(false);
      onEntryCreated?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create entry";
      if (Platform.OS === "web") {
        setError(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="px-screen-x">
      {/* Collapsible header */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-3"
      >
        <View className="flex-row items-center">
          <Ionicons
            name={expanded ? "remove-circle" : "add-circle"}
            size={20}
            color="#00d4aa"
          />
          <Text className="text-txt-secondary text-sm font-medium ml-2">
            Manual Entry
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#5a6270"
        />
      </Pressable>

      {/* Form content */}
      {expanded && (
        <Card variant="elevated" className="mb-4">
          {/* Description */}
          <Input
            placeholder="What did you work on?"
            value={description}
            onChangeText={setDescription}
            className="mb-3"
          />

          {/* Project + Tags row */}
          <View className="flex-row gap-2 mb-3">
            <Pressable
              onPress={() => setShowProjectPicker(true)}
              className="flex-row items-center bg-tf-card border border-tf-border rounded-xl px-3 py-2"
            >
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{
                  backgroundColor: project?.color ?? "#5a6270",
                }}
              />
              <Text className="text-txt-secondary text-xs">
                {project?.name ?? "Project"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowTagPicker(true)}
              className="flex-row items-center bg-tf-card border border-tf-border rounded-xl px-3 py-2"
            >
              <Ionicons name="pricetag-outline" size={12} color="#5a6270" />
              <Text className="text-txt-secondary text-xs ml-1.5">
                {tagIds.length > 0 ? `${tagIds.length} tags` : "Tags"}
              </Text>
            </Pressable>
          </View>

          {/* Tag badges */}
          {tagIds.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {tagIds.map((id) => (
                <Badge key={id} label={`Tag #${id}`} variant="default" size="sm" />
              ))}
            </View>
          )}

          {/* Date */}
          <Input
            label="Date (YYYY-MM-DD)"
            placeholder={nowISO().split("T")[0]}
            value={date}
            onChangeText={setDate}
            className="mb-3"
          />

          {/* Time inputs */}
          <View className="flex-row gap-3 mb-3">
            <Input
              label="Start (HH:MM)"
              placeholder="09:00"
              value={startTime}
              onChangeText={setStartTime}
              className="flex-1"
            />
            <Input
              label="End (HH:MM)"
              placeholder="17:00"
              value={endTime}
              onChangeText={setEndTime}
              className="flex-1"
            />
          </View>

          {/* Error */}
          {error && (
            <Text className="text-danger text-xs mb-3">{error}</Text>
          )}

          {/* Submit */}
          <Button
            variant="accent"
            label="Add Entry"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            icon={<Ionicons name="add" size={16} color="#0a0e1a" />}
          />
        </Card>
      )}

      {/* Modals */}
      <ProjectPicker
        selectedId={projectId}
        onSelect={handleProjectSelect}
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
      />
      <TagPicker
        selectedIds={tagIds}
        onSelect={setTagIds}
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
      />
    </View>
  );
};
