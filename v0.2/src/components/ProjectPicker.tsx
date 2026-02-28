import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "@/db/client";
import { getAllProjects } from "@/models/project";
import type { Project } from "@/types";

/**
 * Modal project selector.
 * Displays a list of active projects with color dots.
 * Allows selecting one project or clearing the selection.
 */

interface ProjectPickerProps {
  /** Currently selected project ID */
  selectedId: number | null;
  /** Called when a project is selected or cleared */
  onSelect: (projectId: number | null) => void;
  /** Whether the modal is visible */
  visible: boolean;
  /** Called to close the modal */
  onClose: () => void;
}

export const ProjectPicker = ({
  selectedId,
  onSelect,
  visible,
  onClose,
}: ProjectPickerProps) => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (visible) {
      loadProjects();
    }
  }, [visible]);

  const loadProjects = async () => {
    try {
      const all = await getAllProjects(db);
      setProjects(all);
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  };

  const handleSelect = (projectId: number | null) => {
    onSelect(projectId);
    onClose();
  };

  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item.id)}
      className={`flex-row items-center px-5 py-3.5 border-b border-tf-border ${
        item.id === selectedId ? "bg-accent-muted" : ""
      }`}
      activeOpacity={0.7}
    >
      <View
        className="w-3 h-3 rounded-full mr-3"
        style={{ backgroundColor: item.color }}
      />
      <Text className="text-txt-primary text-sm font-medium flex-1">
        {item.name}
      </Text>
      {item.id === selectedId && (
        <Ionicons name="checkmark" size={18} color="#00d4aa" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-tf-deep">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-tf-border">
          <Text className="text-txt-primary text-lg font-semibold">
            Select Project
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9aa0b0" />
          </Pressable>
        </View>

        {/* No project option */}
        <TouchableOpacity
          onPress={() => handleSelect(null)}
          className={`flex-row items-center px-5 py-3.5 border-b border-tf-border ${
            selectedId === null ? "bg-accent-muted" : ""
          }`}
          activeOpacity={0.7}
        >
          <Ionicons name="remove-circle-outline" size={14} color="#5a6270" />
          <Text className="text-txt-secondary text-sm ml-3 flex-1">
            No Project
          </Text>
          {selectedId === null && (
            <Ionicons name="checkmark" size={18} color="#00d4aa" />
          )}
        </TouchableOpacity>

        {/* Project list */}
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProject}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-txt-muted text-sm">
                No projects yet. Create one in the Projects tab.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};
