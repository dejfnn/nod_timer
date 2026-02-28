import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/db/client";
import {
  Card,
  Input,
  Button,
  SectionHeader,
  EmptyState,
  Badge,
} from "@/components/ui";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { ProjectCard } from "@/components/ProjectCard";
import {
  createProject,
  getAllProjects,
  updateProject,
  deleteProject,
  getTotalTrackedTime,
} from "@/models/project";
import { getAllClients } from "@/models/client";
import { DEFAULT_PROJECT_COLOR } from "@/constants/config";
import { showToast } from "@/stores/toastStore";
import type { Project, Client } from "@/types";

interface ProjectWithMeta extends Project {
  client?: Client | null;
  trackedSeconds: number;
}

const ProjectsScreen = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // New project form state
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [clientId, setClientId] = useState<number | null>(null);
  const [billable, setBillable] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_PROJECT_COLOR);
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [editBillable, setEditBillable] = useState(false);
  const [editHourlyRate, setEditHourlyRate] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [allProjects, allClients] = await Promise.all([
        getAllProjects(db, showArchived),
        getAllClients(db),
      ]);

      const enriched: ProjectWithMeta[] = await Promise.all(
        allProjects.map(async (p) => {
          const trackedSeconds = await getTotalTrackedTime(db, p.id);
          const client = allClients.find((c) => c.id === p.clientId);
          return { ...p, client, trackedSeconds };
        }),
      );

      setProjects(enriched);
      setClients(allClients);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, [showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const resetForm = () => {
    setName("");
    setColor(DEFAULT_PROJECT_COLOR);
    setClientId(null);
    setBillable(false);
    setHourlyRate("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createProject(db, {
        name: name.trim(),
        color,
        clientId: clientId ?? undefined,
        billable: billable ? 1 : 0,
        hourlyRate: parseFloat(hourlyRate) || 0,
      });
      resetForm();
      setFormOpen(false);
      setRefreshKey((k) => k + 1);
      showToast("Project created", "success");
    } catch (error) {
      console.error("Failed to create project:", error);
      showToast("Failed to create project", "error");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    try {
      await updateProject(db, id, {
        name: editName.trim(),
        color: editColor,
        clientId: editClientId,
        billable: editBillable ? 1 : 0,
        hourlyRate: parseFloat(editHourlyRate) || 0,
      });
      setEditingId(null);
      setRefreshKey((k) => k + 1);
      showToast("Project updated", "success");
    } catch (error) {
      console.error("Failed to update project:", error);
      showToast("Failed to update project", "error");
    }
  };

  const handleArchiveToggle = async (project: Project) => {
    try {
      await updateProject(db, project.id, {
        archived: project.archived === 1 ? 0 : 1,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to toggle archive:", error);
    }
  };

  const handleExpand = (project: Project) => {
    if (editingId === project.id) {
      setEditingId(null);
      return;
    }
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
    setEditClientId(project.clientId);
    setEditBillable(project.billable === 1);
    setEditHourlyRate(project.hourlyRate > 0 ? String(project.hourlyRate) : "");
  };

  const maxTracked = Math.max(...projects.map((p) => p.trackedSeconds), 1);

  const renderProject = ({ item }: { item: ProjectWithMeta }) => (
    <View className="px-screen-x mb-2">
      <ProjectCard
        project={item}
        client={item.client}
        trackedSeconds={item.trackedSeconds}
        maxTrackedSeconds={maxTracked}
        onPress={handleExpand}
        onArchiveToggle={handleArchiveToggle}
      />

      {/* Inline edit form */}
      {editingId === item.id && (
        <Card className="mt-2">
          <Input
            label="Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Project name"
            className="mb-3"
          />

          <Text className="text-xs font-medium text-txt-secondary mb-1.5 ml-1">
            Color
          </Text>
          <ColorSwatchPicker
            selectedColor={editColor}
            onSelect={setEditColor}
            className="mb-3"
          />

          {/* Client picker */}
          <Text className="text-xs font-medium text-txt-secondary mb-1.5 ml-1">
            Client
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            <Pressable onPress={() => setEditClientId(null)}>
              <Badge
                label="None"
                variant={editClientId === null ? "active" : "default"}
                size="sm"
              />
            </Pressable>
            {clients.map((c) => (
              <Pressable key={c.id} onPress={() => setEditClientId(c.id)}>
                <Badge
                  label={c.name}
                  variant={editClientId === c.id ? "active" : "default"}
                  size="sm"
                />
              </Pressable>
            ))}
          </View>

          {/* Billable toggle */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm text-txt-secondary">Billable</Text>
            <Switch
              value={editBillable}
              onValueChange={setEditBillable}
              trackColor={{ false: "#1a2035", true: "#00d4aa" }}
              thumbColor="#ffffff"
            />
          </View>

          {editBillable && (
            <Input
              label="Hourly Rate ($)"
              value={editHourlyRate}
              onChangeText={setEditHourlyRate}
              placeholder="0"
              keyboardType="numeric"
              className="mb-3"
            />
          )}

          <View className="flex-row gap-2">
            <Button
              label="Save"
              variant="accent"
              size="sm"
              onPress={() => handleUpdate(item.id)}
            />
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setEditingId(null)}
            />
          </View>
        </Card>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-screen-x pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-txt-primary text-2xl font-bold">Projects</Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.push("/clients")}>
              <Ionicons name="people-outline" size={22} color="#9aa0b0" />
            </Pressable>
            <Pressable onPress={() => setFormOpen(!formOpen)}>
              <Ionicons
                name={formOpen ? "close-circle" : "add-circle"}
                size={26}
                color="#00d4aa"
              />
            </Pressable>
          </View>
        </View>

        {/* New project form */}
        {formOpen && (
          <View className="px-screen-x mb-4">
            <Card variant="elevated">
              <Text className="text-txt-primary text-base font-semibold mb-3">
                New Project
              </Text>

              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Project name"
                className="mb-3"
              />

              <Text className="text-xs font-medium text-txt-secondary mb-1.5 ml-1">
                Color
              </Text>
              <ColorSwatchPicker
                selectedColor={color}
                onSelect={setColor}
                className="mb-3"
              />

              {/* Client picker */}
              <Text className="text-xs font-medium text-txt-secondary mb-1.5 ml-1">
                Client
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                <Pressable onPress={() => setClientId(null)}>
                  <Badge
                    label="None"
                    variant={clientId === null ? "active" : "default"}
                    size="sm"
                  />
                </Pressable>
                {clients.map((c) => (
                  <Pressable key={c.id} onPress={() => setClientId(c.id)}>
                    <Badge
                      label={c.name}
                      variant={clientId === c.id ? "active" : "default"}
                      size="sm"
                    />
                  </Pressable>
                ))}
              </View>

              {/* Billable toggle */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-txt-secondary">Billable</Text>
                <Switch
                  value={billable}
                  onValueChange={setBillable}
                  trackColor={{ false: "#1a2035", true: "#00d4aa" }}
                  thumbColor="#ffffff"
                />
              </View>

              {billable && (
                <Input
                  label="Hourly Rate ($)"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  placeholder="0"
                  keyboardType="numeric"
                  className="mb-3"
                />
              )}

              <Button
                label="Create Project"
                variant="accent"
                fullWidth
                onPress={handleCreate}
                disabled={!name.trim()}
              />
            </Card>
          </View>
        )}

        {/* Show archived toggle */}
        <View className="px-screen-x mb-2">
          <Pressable
            onPress={() => setShowArchived(!showArchived)}
            className="flex-row items-center"
          >
            <Ionicons
              name={showArchived ? "eye" : "eye-off-outline"}
              size={16}
              color="#5a6270"
            />
            <Text className="text-xs text-txt-muted ml-1.5">
              {showArchived ? "Showing archived" : "Show archived"}
            </Text>
          </Pressable>
        </View>

        {/* Project list */}
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProject}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <EmptyState
              icon={
                <Ionicons name="folder-outline" size={48} color="#5a6270" />
              }
              title="No projects yet"
              description="Create your first project to start organizing your time entries."
              actionLabel="New Project"
              onAction={() => setFormOpen(true)}
            />
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProjectsScreen;
