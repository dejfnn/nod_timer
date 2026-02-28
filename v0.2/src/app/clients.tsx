import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/db/client";
import {
  Card,
  Input,
  Button,
  EmptyState,
} from "@/components/ui";
import { ClientCard } from "@/components/ClientCard";
import {
  createClient,
  getAllClients,
  updateClient,
  deleteClient,
} from "@/models/client";
import { getAllProjects } from "@/models/project";
import type { Client, Project } from "@/types";

interface ClientWithProjects extends Client {
  projects: Project[];
}

const ClientsScreen = () => {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [allClients, allProjects] = await Promise.all([
        getAllClients(db, true),
        getAllProjects(db, true),
      ]);

      const enriched: ClientWithProjects[] = allClients.map((c) => ({
        ...c,
        projects: allProjects.filter((p) => p.clientId === c.id),
      }));

      setClients(enriched);
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      await createClient(db, { name: newName.trim() });
      setNewName("");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      Alert.alert("Error", "A client with that name may already exist.");
    }
  };

  const handleUpdate = async () => {
    if (editingId === null || !editName.trim()) return;

    try {
      await updateClient(db, editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      Alert.alert("Error", "Failed to update client.");
    }
  };

  const handleArchiveToggle = async (client: Client) => {
    try {
      await updateClient(db, client.id, {
        archived: client.archived === 1 ? 0 : 1,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to toggle archive:", error);
    }
  };

  const handleDelete = async (client: Client) => {
    Alert.alert(
      "Delete Client",
      `Are you sure you want to delete "${client.name}"? Projects linked to this client will remain but lose their client association.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient(db, client.id);
              setRefreshKey((k) => k + 1);
            } catch (error) {
              console.error("Failed to delete client:", error);
            }
          },
        },
      ],
    );
  };

  const handleEdit = (client: Client) => {
    if (editingId === client.id) {
      setEditingId(null);
      return;
    }
    setEditingId(client.id);
    setEditName(client.name);
  };

  const renderClient = ({ item }: { item: ClientWithProjects }) => (
    <View className="px-screen-x mb-2">
      <ClientCard
        client={item}
        projects={item.projects}
        onPress={handleEdit}
        onEdit={handleEdit}
        onArchiveToggle={handleArchiveToggle}
        onDelete={handleDelete}
      />

      {/* Edit form */}
      {editingId === item.id && (
        <Card className="mt-2">
          <Input
            label="Client Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Client name"
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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Clients",
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
          {/* Create client form */}
          <View className="px-screen-x py-4">
            <Card variant="elevated">
              <Text className="text-txt-primary text-base font-semibold mb-3">
                New Client
              </Text>
              <View className="flex-row items-end gap-2">
                <View className="flex-1">
                  <Input
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Client name"
                  />
                </View>
                <Button
                  label="Add"
                  variant="accent"
                  size="md"
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                />
              </View>
            </Card>
          </View>

          {/* Client list */}
          <FlatList
            data={clients}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderClient}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={
              <EmptyState
                icon={
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color="#5a6270"
                  />
                }
                title="No clients yet"
                description="Add your first client to organize projects by company or team."
              />
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default ClientsScreen;
