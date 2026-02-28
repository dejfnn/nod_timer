import { View, Text } from "react-native";

/**
 * Simple horizontal bar chart — pure React Native.
 * Matches the Obsidian Chronograph dark-theme aesthetic.
 */

interface HorizontalBarItem {
  label: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  /** Unit label shown after value (default: "h") */
  unit?: string;
  /** Maximum bar height — not used for horizontal, this is max bar width fraction */
  className?: string;
}

export const HorizontalBarChart = ({
  data,
  unit = "h",
  className = "",
}: HorizontalBarChartProps) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 0.1);

  return (
    <View className={className}>
      {data.map((item, index) => {
        const widthPercent = (item.value / maxValue) * 100;

        return (
          <View key={`${item.label}-${index}`} className="mb-2.5">
            {/* Label row */}
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-txt-primary" numberOfLines={1} style={{ maxWidth: "60%" }}>
                {item.label}
              </Text>
              <Text className="text-sm font-mono text-txt-secondary">
                {item.value.toFixed(1)}{unit}
              </Text>
            </View>

            {/* Bar */}
            <View className="h-3 bg-tf-elevated rounded-pill overflow-hidden">
              <View
                className="h-full rounded-pill"
                style={{
                  width: `${Math.max(widthPercent, 1)}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};
