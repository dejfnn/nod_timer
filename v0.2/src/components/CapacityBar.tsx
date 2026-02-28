import { View, Text } from "react-native";
import { ProgressBar } from "@/components/ui";

/**
 * Capacity bar showing daily progress with percentage label.
 * 12px thick with gradient-style fill.
 */

interface CapacityBarProps {
  /** Current tracked seconds */
  trackedSeconds: number;
  /** Working hours capacity (e.g. 8.0) */
  workingHours: number;
  className?: string;
}

export const CapacityBar = ({
  trackedSeconds,
  workingHours,
  className = "",
}: CapacityBarProps) => {
  const capacitySeconds = workingHours * 3600;
  const percent =
    capacitySeconds > 0
      ? Math.min((trackedSeconds / capacitySeconds) * 100, 100)
      : 0;
  const progress = percent / 100;
  const hoursTracked = Math.round((trackedSeconds / 3600) * 100) / 100;

  return (
    <View className={`px-screen-x ${className}`}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-txt-secondary">
          Daily capacity
        </Text>
        <Text className="text-xs text-txt-primary font-semibold">
          {hoursTracked}h / {workingHours}h ({Math.round(percent)}%)
        </Text>
      </View>
      <ProgressBar
        progress={progress}
        height={12}
        color={percent >= 100 ? "#2ecc71" : "#00d4aa"}
        glow
      />
    </View>
  );
};
