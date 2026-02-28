import { View, Text } from "react-native";
import type { DailyHours } from "@/types";

/**
 * Simple dark-themed bar chart for last 7 days.
 * Pure React Native implementation (no Victory Native dependency).
 *
 * Uses the Obsidian Chronograph color palette:
 * blue-to-teal gradient approximation via alternating bar colors.
 */

interface BarChartProps {
  data: DailyHours[];
  /** Height of the chart area in pixels */
  height?: number;
  className?: string;
}

/** Get short day label from date string "YYYY-MM-DD". */
function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

/** Interpolate between two hex colors. */
function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);

  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export const BarChart = ({
  data,
  height = 160,
  className = "",
}: BarChartProps) => {
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <View className={className}>
      <View
        className="flex-row items-end justify-between px-1"
        style={{ height }}
      >
        {data.map((item, index) => {
          const barHeight = maxHours > 0
            ? (item.hours / maxHours) * (height - 30)
            : 0;
          const color = lerpColor("#4A90D9", "#00d4aa", index / Math.max(data.length - 1, 1));

          return (
            <View key={item.date} className="items-center flex-1 mx-0.5">
              {/* Hours label on top of bar */}
              {item.hours > 0 && (
                <Text
                  className="text-txt-secondary mb-1"
                  style={{ fontSize: 9 }}
                >
                  {item.hours.toFixed(1)}
                </Text>
              )}

              {/* Bar */}
              <View
                style={{
                  width: "70%",
                  height: Math.max(barHeight, 2),
                  backgroundColor: color,
                  borderRadius: 4,
                  minHeight: 2,
                }}
              />

              {/* Day label */}
              <Text
                className="text-txt-muted mt-1.5"
                style={{ fontSize: 10 }}
              >
                {getDayLabel(item.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
