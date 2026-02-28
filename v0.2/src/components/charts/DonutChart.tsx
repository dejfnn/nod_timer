import { View, Text } from "react-native";
import type { ProjectDistribution } from "@/types";

/**
 * Simple donut chart for project distribution.
 * Pure React Native implementation using stacked colored segments
 * arranged as a visual ring approximation.
 *
 * Uses a horizontal stacked bar as a compact alternative to a true SVG donut.
 */

interface DonutChartProps {
  data: ProjectDistribution[];
  className?: string;
}

export const DonutChart = ({
  data,
  className = "",
}: DonutChartProps) => {
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);

  if (data.length === 0 || totalHours === 0) {
    return (
      <View className={`items-center py-4 ${className}`}>
        <Text className="text-txt-muted text-sm">No project data</Text>
      </View>
    );
  }

  return (
    <View className={className}>
      {/* Stacked horizontal bar */}
      <View className="flex-row h-4 rounded-pill overflow-hidden mb-4">
        {data.map((item, index) => {
          const widthPercent = (item.hours / totalHours) * 100;
          return (
            <View
              key={`${item.name}-${index}`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: item.color,
                minWidth: widthPercent > 0 ? 2 : 0,
              }}
            />
          );
        })}
      </View>

      {/* Center total */}
      <View className="items-center mb-4">
        <Text className="text-metric-value text-txt-primary font-bold">
          {totalHours.toFixed(1)}h
        </Text>
        <Text className="text-xs text-txt-muted">Total</Text>
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-2">
        {data.map((item, index) => (
          <View key={`${item.name}-${index}`} className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-1.5"
              style={{ backgroundColor: item.color }}
            />
            <Text className="text-xs text-txt-secondary">
              {item.name}{" "}
              <Text className="text-txt-muted">
                ({item.hours.toFixed(1)}h)
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
