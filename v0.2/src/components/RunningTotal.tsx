import { View, Text } from "react-native";
import { ProgressBar } from "@/components/ui";
import { formatDuration } from "@/utils/time";
import { DEFAULT_WORKING_HOURS } from "@/constants/config";

/**
 * Running total bar displayed at the bottom of the timer screen.
 * Shows today's total duration, decimal hours, and a progress bar
 * representing progress towards the daily working hours goal.
 */

interface RunningTotalProps {
  /** Total seconds tracked today */
  totalSeconds: number;
  /** Working hours target (default: 8.0) */
  workingHours?: number;
  className?: string;
}

export const RunningTotal = ({
  totalSeconds,
  workingHours = DEFAULT_WORKING_HOURS,
  className = "",
}: RunningTotalProps) => {
  const totalHours = totalSeconds / 3600;
  const progress = workingHours > 0 ? totalHours / workingHours : 0;
  const percentage = Math.min(100, Math.round(progress * 100));

  return (
    <View
      className={`bg-tf-card border-t border-tf-border px-screen-x py-3 ${className}`}
    >
      {/* Top row: label + values */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-txt-secondary text-xs font-medium uppercase"
          style={{ letterSpacing: 1 }}
        >
          Today's Total
        </Text>
        <View className="flex-row items-baseline">
          <Text
            className="text-txt-primary text-lg font-mono font-bold mr-2"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatDuration(totalSeconds)}
          </Text>
          <Text className="text-txt-muted text-xs">
            {totalHours.toFixed(1)}h
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="flex-row items-center">
        <View className="flex-1 mr-3">
          <ProgressBar progress={progress} height={6} glow />
        </View>
        <Text className="text-txt-muted text-xs" style={{ fontVariant: ["tabular-nums"] }}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};
