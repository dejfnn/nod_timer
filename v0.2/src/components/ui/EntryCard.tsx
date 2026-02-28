import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "./Badge";
import { formatDuration, formatTimeShort } from "@/utils/time";
import type { TimeEntry, Project, Tag } from "@/types";

/**
 * Time entry card for the today's entries list.
 *
 * Shows:
 * - Left color border (project color)
 * - Description (bold)
 * - Project pill badge
 * - Tag pills
 * - Time range (start - stop)
 * - Duration (monospace, right-aligned)
 * - Optional delete button
 */

interface EntryCardProps {
  entry: TimeEntry;
  project?: Project | null;
  tags?: Tag[];
  /** Called when the delete button is pressed */
  onDelete?: (id: number) => void;
  /** Called when the card is pressed */
  onPress?: (id: number) => void;
  className?: string;
}

export const EntryCard = ({
  entry,
  project,
  tags = [],
  onDelete,
  onPress,
  className = "",
}: EntryCardProps) => {
  const projectColor = project?.color ?? "#4A90D9";
  const duration = entry.durationSeconds ?? 0;
  const description = entry.description || "No description";

  const timeRange =
    entry.startTime && entry.stopTime
      ? `${formatTimeShort(entry.startTime)} - ${formatTimeShort(entry.stopTime)}`
      : entry.startTime
        ? `${formatTimeShort(entry.startTime)} - running`
        : "";

  return (
    <Pressable
      onPress={() => onPress?.(entry.id)}
      className={`bg-tf-card rounded-2xl p-card-p border border-tf-border ${className}`}
      style={({ pressed }) => [
        { borderLeftWidth: 4, borderLeftColor: projectColor },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
      ]}
    >
      {/* Top row: description + duration */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text
            className="text-txt-primary text-sm font-semibold"
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
        <Text
          className="text-txt-primary text-sm font-mono"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatDuration(duration)}
        </Text>
      </View>

      {/* Middle row: project + tags */}
      <View className="flex-row flex-wrap items-center gap-1.5 mb-2">
        {project && (
          <Badge
            label={project.name}
            variant="custom"
            color={projectColor}
            dot
            size="sm"
          />
        )}
        {tags.map((tag) => (
          <Badge key={tag.id} label={tag.name} variant="default" size="sm" />
        ))}
      </View>

      {/* Bottom row: time range + delete */}
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-txt-muted">{timeRange}</Text>
        {onDelete && (
          <Pressable
            onPress={() => onDelete(entry.id)}
            hitSlop={8}
            className="p-1"
          >
            <Ionicons name="trash-outline" size={14} color="#5a6270" />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};
