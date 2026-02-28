import { View, Text } from "react-native";
import { Button } from "./Button";

/**
 * Empty state placeholder for lists and screens with no data.
 * Minimal, refined — consistent with the Obsidian Chronograph aesthetic.
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) => (
  <View className={`items-center justify-center py-12 px-8 ${className}`}>
    {icon && <View className="mb-4 opacity-40">{icon}</View>}

    <Text className="text-base font-semibold text-txt-secondary text-center">
      {title}
    </Text>

    {description && (
      <Text className="text-sm text-txt-muted text-center mt-2 max-w-[260px]">
        {description}
      </Text>
    )}

    {actionLabel && onAction && (
      <View className="mt-5">
        <Button variant="ghost" size="sm" label={actionLabel} onPress={onAction} />
      </View>
    )}
  </View>
);
