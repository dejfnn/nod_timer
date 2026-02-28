import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, ProgressBar } from "@/components/ui";
import { formatDuration } from "@/utils/time";
import type { Project, Client } from "@/types";

/**
 * Project card with left color border, client/billable badges, and tracked time bar.
 */

interface ProjectCardProps {
  project: Project;
  /** Client associated with the project */
  client?: Client | null;
  /** Total tracked time in seconds */
  trackedSeconds: number;
  /** Max tracked time across all projects (for relative bar) */
  maxTrackedSeconds: number;
  /** Called when the card is pressed */
  onPress?: (project: Project) => void;
  /** Called when archive/unarchive button is pressed */
  onArchiveToggle?: (project: Project) => void;
  className?: string;
}

export const ProjectCard = ({
  project,
  client,
  trackedSeconds,
  maxTrackedSeconds,
  onPress,
  onArchiveToggle,
  className = "",
}: ProjectCardProps) => {
  const hours = Math.round((trackedSeconds / 3600) * 100) / 100;
  const progress = maxTrackedSeconds > 0 ? trackedSeconds / maxTrackedSeconds : 0;

  return (
    <Pressable
      onPress={() => onPress?.(project)}
      className={`bg-tf-card rounded-2xl p-card-p border border-tf-border ${className}`}
      style={({ pressed }) => [
        {
          borderLeftWidth: 8,
          borderLeftColor: project.color,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
      ]}
    >
      {/* Top row: name + badges */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1 flex-row items-center flex-wrap gap-1.5 mr-2">
          <Text
            className="text-txt-primary text-base font-semibold mr-1"
            numberOfLines={1}
          >
            {project.name}
          </Text>
          {client && (
            <Badge label={client.name} variant="info" size="sm" />
          )}
          {project.billable === 1 && (
            <Badge
              label={`$${project.hourlyRate}/h`}
              variant="success"
              size="sm"
            />
          )}
          {project.archived === 1 && (
            <Badge label="Archived" variant="warning" size="sm" />
          )}
        </View>

        {/* Archive toggle */}
        {onArchiveToggle && (
          <Pressable
            onPress={() => onArchiveToggle(project)}
            hitSlop={8}
            className="p-1"
          >
            <Ionicons
              name={project.archived === 1 ? "arrow-undo-outline" : "archive-outline"}
              size={18}
              color="#5a6270"
            />
          </Pressable>
        )}
      </View>

      {/* Bottom row: progress bar + hours */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <ProgressBar progress={progress} color={project.color} height={6} />
        </View>
        <Text
          className="text-xs text-txt-secondary font-mono min-w-[60px] text-right"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {hours > 0 ? `${hours.toFixed(1)}h` : formatDuration(trackedSeconds)}
        </Text>
      </View>
    </Pressable>
  );
};
