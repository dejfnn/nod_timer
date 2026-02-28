import { View, Text, ScrollView } from "react-native";
import type { WeeklyReportRow } from "@/services/reports";

/**
 * Weekly heatmap grid: project × day-of-week with hours.
 * Pure React Native — Obsidian Chronograph style.
 */

interface HeatmapGridProps {
  data: WeeklyReportRow[];
  className?: string;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Map an hours value to a background opacity / intensity.
 * 0 → transparent, max → full color.
 */
function heatColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return "transparent";
  const intensity = Math.min(value / maxValue, 1);
  // Teal with varying opacity
  const alpha = Math.round(0.15 + intensity * 0.55 * 255)
    .toString(16)
    .padStart(2, "0");
  return `#00d4aa${alpha}`;
}

export const HeatmapGrid = ({ data, className = "" }: HeatmapGridProps) => {
  if (data.length === 0) return null;

  // Find max value across all cells for heat coloring
  const allValues = data.flatMap((r) => r.days);
  const maxValue = Math.max(...allValues, 0.1);

  // Compute column totals
  const colTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const row of data) {
    for (let i = 0; i < 7; i++) {
      colTotals[i] += row.days[i];
    }
  }
  const grandTotal = Math.round(
    colTotals.reduce((a, b) => a + b, 0) * 100,
  ) / 100;

  const CELL_W = 52;
  const LABEL_W = 100;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className={className}>
        {/* Header row */}
        <View className="flex-row mb-1">
          <View style={{ width: LABEL_W }} className="justify-center pr-2">
            <Text className="text-xs text-txt-muted font-semibold uppercase" style={{ letterSpacing: 1 }}>
              Project
            </Text>
          </View>
          {DAY_LABELS.map((day) => (
            <View key={day} style={{ width: CELL_W }} className="items-center">
              <Text className="text-xs text-txt-muted font-medium">{day}</Text>
            </View>
          ))}
          <View style={{ width: CELL_W }} className="items-center">
            <Text className="text-xs text-txt-muted font-semibold">Total</Text>
          </View>
        </View>

        {/* Data rows */}
        {data.map((row, rIdx) => (
          <View
            key={`${row.projectId}-${rIdx}`}
            className={`flex-row py-1.5 ${
              rIdx % 2 === 0 ? "bg-tf-card" : "bg-tf-elevated"
            } rounded-lg mb-0.5`}
          >
            <View style={{ width: LABEL_W }} className="justify-center pr-2 pl-2">
              <View className="flex-row items-center">
                <View
                  className="w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: row.projectColor }}
                />
                <Text className="text-sm text-txt-primary" numberOfLines={1}>
                  {row.projectName}
                </Text>
              </View>
            </View>
            {row.days.map((val, dIdx) => (
              <View
                key={dIdx}
                style={{
                  width: CELL_W,
                  backgroundColor: heatColor(val, maxValue),
                }}
                className="items-center justify-center py-1 rounded"
              >
                <Text
                  className={`text-xs font-mono ${
                    val > 0 ? "text-txt-primary" : "text-txt-faint"
                  }`}
                >
                  {val > 0 ? val.toFixed(1) : "—"}
                </Text>
              </View>
            ))}
            <View style={{ width: CELL_W }} className="items-center justify-center">
              <Text className="text-xs font-mono font-semibold text-accent">
                {row.total.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}

        {/* Totals row */}
        <View className="flex-row py-2 border-t border-tf-border-strong mt-1">
          <View style={{ width: LABEL_W }} className="justify-center pr-2 pl-2">
            <Text className="text-xs font-semibold text-txt-muted uppercase" style={{ letterSpacing: 1 }}>
              Total
            </Text>
          </View>
          {colTotals.map((total, idx) => (
            <View key={idx} style={{ width: CELL_W }} className="items-center">
              <Text className="text-xs font-mono font-semibold text-txt-primary">
                {Math.round(total * 100) / 100 > 0
                  ? (Math.round(total * 100) / 100).toFixed(1)
                  : "—"}
              </Text>
            </View>
          ))}
          <View style={{ width: CELL_W }} className="items-center">
            <Text className="text-xs font-mono font-bold text-accent">
              {grandTotal.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
