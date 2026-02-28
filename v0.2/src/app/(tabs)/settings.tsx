import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  RefreshControl,
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
} from "@/components/ui";
import { getSetting, setSetting, getWorkingHours, exportAllData, importAllData } from "@/models/settings";
import { getAllProjects } from "@/models/project";
import { APP_NAME, APP_VERSION } from "@/constants/config";
import { showToast } from "@/stores/toastStore";
import type { Project } from "@/types";

const SettingsScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Defaults section
  const [projects, setProjects] = useState<Project[]>([]);
  const [defaultProjectId, setDefaultProjectId] = useState<number | null>(null);
  const [defaultBillable, setDefaultBillable] = useState(false);
  const [timezone, setTimezone] = useState("");

  // Working hours section
  const [workingHours, setWorkingHours] = useState("8.0");

  // Load settings from DB
  const loadSettings = useCallback(async () => {
    try {
      const [
        allProjects,
        storedDefaultProject,
        storedDefaultBillable,
        storedTimezone,
        storedWorkingHours,
      ] = await Promise.all([
        getAllProjects(db),
        getSetting(db, "default_project_id"),
        getSetting(db, "default_billable"),
        getSetting(db, "timezone"),
        getWorkingHours(db),
      ]);

      setProjects(allProjects);
      setDefaultProjectId(storedDefaultProject ? parseInt(storedDefaultProject, 10) : null);
      setDefaultBillable(storedDefaultBillable === "1");
      setTimezone(storedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setWorkingHours(String(storedWorkingHours));
      setLoading(false);
    } catch (error) {
      console.error("Failed to load settings:", error);
      showToast("Failed to load settings", "error");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  }, [loadSettings]);

  // Save defaults
  const handleSaveDefaults = async () => {
    try {
      await setSetting(db, "default_project_id", defaultProjectId ? String(defaultProjectId) : "");
      await setSetting(db, "default_billable", defaultBillable ? "1" : "0");
      await setSetting(db, "timezone", timezone);
      showToast("Defaults saved", "success");
    } catch (error) {
      console.error("Failed to save defaults:", error);
      showToast("Failed to save defaults", "error");
    }
  };

  // Save working hours
  const handleSaveWorkingHours = async () => {
    const parsed = parseFloat(workingHours);
    if (isNaN(parsed) || parsed < 0.5 || parsed > 24.0) {
      showToast("Working hours must be between 0.5 and 24.0", "error");
      return;
    }
    try {
      await setSetting(db, "working_hours", String(parsed));
      showToast("Working hours saved", "success");
    } catch (error) {
      console.error("Failed to save working hours:", error);
      showToast("Failed to save working hours", "error");
    }
  };

  // Export JSON backup
  const handleExport = async () => {
    try {
      const data = await exportAllData(db);
      const jsonString = JSON.stringify(data, null, 2);

      // Use expo-file-system + expo-sharing to share the JSON backup
      const FileSystem = require("expo-file-system");
      const Sharing = require("expo-sharing");

      const filename = `timeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export TimeFlow Backup",
        });
        showToast("Backup exported successfully", "success");
      } else {
        showToast("Sharing is not available on this device", "error");
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      showToast("Failed to export data", "error");
    }
  };

  // Import JSON backup
  const handleImport = async () => {
    Alert.alert(
      "Import Backup",
      "This will replace ALL existing data with the backup. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            try {
              const DocumentPicker = require("expo-document-picker");
              const FileSystem = require("expo-file-system");

              const result = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
              });

              if (result.canceled) return;

              const file = result.assets?.[0];
              if (!file?.uri) {
                showToast("No file selected", "error");
                return;
              }

              const content = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });

              const data = JSON.parse(content);

              if (!data.clients || !data.timeEntries) {
                showToast("Invalid backup file format", "error");
                return;
              }

              await importAllData(db, data);
              showToast("Data imported successfully", "success");
              await loadSettings();
            } catch (error) {
              console.error("Failed to import data:", error);
              showToast("Failed to import data", "error");
            }
          },
        },
      ],
    );
  };

  const selectedProject = projects.find((p) => p.id === defaultProjectId);

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4aa"
            />
          }
        >
          {/* Header */}
          <View className="px-screen-x pt-4 pb-4">
            <Text className="text-txt-primary text-2xl font-bold">Settings</Text>
          </View>

          {/* ---- DEFAULTS SECTION ---- */}
          <SectionHeader title="Defaults" />
          <View className="px-screen-x mb-section-gap">
            <Card variant="surface">
              {/* Default project picker */}
              <Text className="text-xs font-medium text-txt-secondary mb-2 ml-1">
                Default Project
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 6 }}
              >
                <Button
                  label="None"
                  variant={defaultProjectId === null ? "accent" : "ghost"}
                  size="sm"
                  onPress={() => setDefaultProjectId(null)}
                />
                {projects.map((p) => (
                  <Button
                    key={p.id}
                    label={p.name}
                    variant={defaultProjectId === p.id ? "accent" : "ghost"}
                    size="sm"
                    icon={
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: p.color,
                        }}
                      />
                    }
                    onPress={() => setDefaultProjectId(p.id)}
                  />
                ))}
              </ScrollView>

              {/* Default billable toggle */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color="#9aa0b0"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-sm text-txt-secondary">Default Billable</Text>
                </View>
                <Switch
                  value={defaultBillable}
                  onValueChange={setDefaultBillable}
                  trackColor={{ false: "#1a2035", true: "#00d4aa" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Timezone display */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color="#9aa0b0"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-sm text-txt-secondary">Timezone</Text>
                </View>
                <Text className="text-sm text-txt-primary">{timezone}</Text>
              </View>

              <Button
                label="Save Defaults"
                variant="primary"
                size="sm"
                fullWidth
                onPress={handleSaveDefaults}
                icon={<Ionicons name="checkmark" size={16} color="#ffffff" />}
              />
            </Card>
          </View>

          {/* ---- WORKING HOURS SECTION ---- */}
          <SectionHeader title="Working Hours" />
          <View className="px-screen-x mb-section-gap">
            <Card variant="surface">
              <Text className="text-xs text-txt-muted mb-3">
                Hours per working day (0.5 - 24.0). Affects dashboard capacity calculation.
              </Text>
              <Input
                label="Hours per day"
                value={workingHours}
                onChangeText={setWorkingHours}
                keyboardType="decimal-pad"
                placeholder="8.0"
                className="mb-3"
                iconLeft={
                  <Ionicons name="time-outline" size={16} color="#5a6270" />
                }
              />
              <Button
                label="Save Working Hours"
                variant="primary"
                size="sm"
                fullWidth
                onPress={handleSaveWorkingHours}
                icon={<Ionicons name="checkmark" size={16} color="#ffffff" />}
              />
            </Card>
          </View>

          {/* ---- DATA MANAGEMENT SECTION ---- */}
          <SectionHeader title="Data Management" />
          <View className="px-screen-x mb-section-gap">
            <Card variant="surface">
              <Text className="text-xs text-txt-muted mb-4">
                Export all your data as a JSON backup file, or import a previously exported backup.
                Importing will replace all existing data.
              </Text>

              <View className="gap-2">
                <Button
                  label="Export JSON Backup"
                  variant="accent"
                  size="md"
                  fullWidth
                  onPress={handleExport}
                  icon={<Ionicons name="download-outline" size={16} color="#0a0e1a" />}
                />
                <Button
                  label="Import JSON Backup"
                  variant="ghost"
                  size="md"
                  fullWidth
                  onPress={handleImport}
                  icon={<Ionicons name="push-outline" size={16} color="#9aa0b0" />}
                />
              </View>
            </Card>
          </View>

          {/* ---- MANAGEMENT LINKS SECTION ---- */}
          <SectionHeader title="Management" />
          <View className="px-screen-x mb-section-gap gap-2">
            <Card variant="interactive" onPress={() => router.push("/clients")}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color="#9aa0b0"
                    style={{ marginRight: 12 }}
                  />
                  <Text className="text-txt-primary text-sm font-medium">
                    Manage Clients
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#5a6270" />
              </View>
            </Card>

            <Card variant="interactive" onPress={() => router.push("/tags")}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="pricetags-outline"
                    size={20}
                    color="#9aa0b0"
                    style={{ marginRight: 12 }}
                  />
                  <Text className="text-txt-primary text-sm font-medium">
                    Manage Tags
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#5a6270" />
              </View>
            </Card>
          </View>

          {/* ---- ABOUT SECTION ---- */}
          <SectionHeader title="About" />
          <View className="px-screen-x mb-section-gap">
            <Card variant="surface">
              <View className="items-center py-2">
                <Ionicons name="timer-outline" size={36} color="#00d4aa" />
                <Text className="text-txt-primary text-lg font-bold mt-2">
                  {APP_NAME}
                </Text>
                <Text className="text-txt-secondary text-sm mt-0.5">
                  Version {APP_VERSION}
                </Text>
                <View className="mt-3 items-center">
                  <Text className="text-xs text-txt-muted">
                    Expo SDK + React Native
                  </Text>
                  <Text className="text-xs text-txt-muted mt-0.5">
                    TypeScript + NativeWind + Drizzle ORM
                  </Text>
                  <Text className="text-xs text-txt-muted mt-0.5">
                    Zustand + expo-sqlite
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
