import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/components/ui";
import type { Client, Project } from "@/types";

/**
 * Client card displaying client name, project count, and project pills.
 */

interface ClientCardProps {
  client: Client;
  /** Projects belonging to this client */
  projects: Project[];
  /** Called when the card is pressed */
  onPress?: (client: Client) => void;
  /** Called when edit is pressed */
  onEdit?: (client: Client) => void;
  /** Called when archive/unarchive is pressed */
  onArchiveToggle?: (client: Client) => void;
  /** Called when delete is pressed */
  onDelete?: (client: Client) => void;
  className?: string;
}

export const ClientCard = ({
  client,
  projects,
  onPress,
  onEdit,
  onArchiveToggle,
  onDelete,
  className = "",
}: ClientCardProps) => {
  return (
    <Pressable
      onPress={() => onPress?.(client)}
      className={`bg-tf-card rounded-2xl p-card-p border border-tf-border ${className}`}
      style={({ pressed }) => [
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
      ]}
    >
      {/* Top row: name + badges + actions */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <Text
            className="text-txt-primary text-base font-semibold mr-2"
            numberOfLines={1}
          >
            {client.name}
          </Text>
          <Badge
            label={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            variant="default"
            size="sm"
          />
          {client.archived === 1 && (
            <Badge
              label="Archived"
              variant="warning"
              size="sm"
              className="ml-1"
            />
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row items-center gap-2">
          {onEdit && (
            <Pressable onPress={() => onEdit(client)} hitSlop={8} className="p-1">
              <Ionicons name="pencil-outline" size={16} color="#5a6270" />
            </Pressable>
          )}
          {onArchiveToggle && (
            <Pressable
              onPress={() => onArchiveToggle(client)}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons
                name={client.archived === 1 ? "arrow-undo-outline" : "archive-outline"}
                size={16}
                color="#5a6270"
              />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={() => onDelete(client)}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Project pills */}
      {projects.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {projects.map((project) => (
            <Badge
              key={project.id}
              label={project.name}
              variant="custom"
              color={project.color}
              dot
              size="sm"
            />
          ))}
        </View>
      )}
    </Pressable>
  );
};
