import { useState, useEffect } from "react";
import { View, Text, Modal, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "@/components/ui";
import { db } from "@/db/client";
import { getAllTags } from "@/models/tag";
import type { Tag } from "@/types";

/**
 * Modal multi-select tag selector.
 * Displays tags as pill badges. Tapping toggles selection.
 */

interface TagPickerProps {
  /** Currently selected tag IDs */
  selectedIds: number[];
  /** Called when selection changes */
  onSelect: (tagIds: number[]) => void;
  /** Whether the modal is visible */
  visible: boolean;
  /** Called to close the modal */
  onClose: () => void;
}

export const TagPicker = ({
  selectedIds,
  onSelect,
  visible,
  onClose,
}: TagPickerProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds));

  useEffect(() => {
    if (visible) {
      setSelected(new Set(selectedIds));
      loadTags();
    }
  }, [visible, selectedIds]);

  const loadTags = async () => {
    try {
      const all = await getAllTags(db);
      setTags(all);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleDone = () => {
    onSelect(Array.from(selected));
    onClose();
  };

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
            Select Tags
          </Text>
          <Pressable onPress={handleDone} hitSlop={8}>
            <Text className="text-accent text-sm font-semibold">Done</Text>
          </Pressable>
        </View>

        {/* Tag grid */}
        <ScrollView className="flex-1 px-5 pt-4">
          {tags.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-txt-muted text-sm">
                No tags yet. Create tags in Settings.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selected.has(tag.id);
                return (
                  <Pressable key={tag.id} onPress={() => toggleTag(tag.id)}>
                    <Badge
                      label={tag.name}
                      variant={isSelected ? "active" : "default"}
                      size="md"
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Clear all button */}
        {selected.size > 0 && (
          <View className="px-5 pb-4">
            <Pressable
              onPress={() => setSelected(new Set())}
              className="items-center py-2"
            >
              <Text className="text-txt-muted text-xs">Clear all</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};
