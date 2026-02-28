import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/db/client";
import { Card, Input, Button, Badge, EmptyState } from "@/components/ui";
import {
  createTag,
  getAllTags,
  updateTag,
  deleteTag,
  getUsageCount,
} from "@/models/tag";
import { showToast } from "@/stores/toastStore";
import type { Tag } from "@/types";

interface TagWithCount extends Tag {
  usageCount: number;
}

const TagsScreen = () => {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const allTags = await getAllTags(db);
      const enriched: TagWithCount[] = await Promise.all(
        allTags.map(async (t) => {
          const usageCount = await getUsageCount(db, t.id);
          return { ...t, usageCount };
        }),
      );
      setTags(enriched);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      await createTag(db, { name: newName.trim() });
      setNewName("");
      setRefreshKey((k) => k + 1);
      showToast("Tag created", "success");
    } catch (error) {
      Alert.alert("Error", "A tag with that name may already exist.");
    }
  };

  const handleUpdate = async () => {
    if (editingId === null || !editName.trim()) return;

    try {
      await updateTag(db, editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      setRefreshKey((k) => k + 1);
      showToast("Tag updated", "success");
    } catch (error) {
      Alert.alert("Error", "Failed to update tag.");
    }
  };

  const handleDelete = async (tag: TagWithCount) => {
    const cascadeWarning =
      tag.usageCount > 0
        ? ` This tag is used in ${tag.usageCount} time ${tag.usageCount === 1 ? "entry" : "entries"} and will be removed from all of them.`
        : "";

    Alert.alert(
      "Delete Tag",
      `Are you sure you want to delete "${tag.name}"?${cascadeWarning}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTag(db, tag.id);
              if (editingId === tag.id) setEditingId(null);
              setRefreshKey((k) => k + 1);
            } catch (error) {
              console.error("Failed to delete tag:", error);
            }
          },
        },
      ],
    );
  };

  const handleTagPress = (tag: TagWithCount) => {
    if (editingId === tag.id) {
      setEditingId(null);
      return;
    }
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Tags",
          headerStyle: { backgroundColor: "#0a0e1a" },
          headerTintColor: "#e8eaed",
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView className="flex-1 bg-tf-deep" edges={[]}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Inline new tag input */}
            <View className="px-screen-x py-4">
              <Card variant="elevated">
                <Text className="text-txt-primary text-base font-semibold mb-3">
                  New Tag
                </Text>
                <View className="flex-row items-end gap-2">
                  <View className="flex-1">
                    <Input
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Tag name"
                      onSubmitEditing={handleCreate}
                      returnKeyType="done"
                    />
                  </View>
                  <Button
                    label="+"
                    variant="accent"
                    size="md"
                    onPress={handleCreate}
                    disabled={!newName.trim()}
                  />
                </View>
              </Card>
            </View>

            {/* Tags grid */}
            <View className="px-screen-x">
              {tags.length === 0 ? (
                <EmptyState
                  icon={
                    <Ionicons
                      name="pricetags-outline"
                      size={48}
                      color="#5a6270"
                    />
                  }
                  title="No tags yet"
                  description="Create tags to categorize and filter your time entries."
                />
              ) : (
                <>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {tags.map((tag) => (
                      <Pressable
                        key={tag.id}
                        onPress={() => handleTagPress(tag)}
                      >
                        <View
                          className={`flex-row items-center rounded-pill px-3 py-1.5 ${
                            editingId === tag.id
                              ? "bg-accent-muted border border-accent"
                              : "bg-tf-elevated border border-tf-border"
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium mr-1.5 ${
                              editingId === tag.id
                                ? "text-accent"
                                : "text-txt-primary"
                            }`}
                          >
                            {tag.name}
                          </Text>
                          <Text className="text-xs text-txt-muted">
                            ({tag.usageCount})
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* Edit/delete section */}
                  {editingId !== null && (
                    <Card>
                      <Text className="text-sm text-txt-secondary mb-2">
                        Edit Tag
                      </Text>
                      <Input
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Tag name"
                        className="mb-3"
                      />
                      <View className="flex-row gap-2">
                        <Button
                          label="Save"
                          variant="accent"
                          size="sm"
                          onPress={handleUpdate}
                          disabled={!editName.trim()}
                        />
                        <Button
                          label="Delete"
                          variant="danger"
                          size="sm"
                          onPress={() => {
                            const tag = tags.find((t) => t.id === editingId);
                            if (tag) handleDelete(tag);
                          }}
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
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default TagsScreen;
