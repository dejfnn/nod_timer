import { View, Text, ScrollView } from "react-native";
import type { GroupSummary } from "@/types";
import { formatDuration } from "@/utils/time";

interface ReportTableProps {
  data: GroupSummary[];
  /** Label for the group column (e.g., "Project", "Client", "Date") */
  groupLabel: string;
  /** Show color dots (project view) */
  showColorDots?: boolean;
  className?: string;
}

export const ReportTable = ({
  data,
  groupLabel,
  showColorDots = false,
  className = "",
}: ReportTableProps) => {
  if (data.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className={`min-w-full ${className}`}>
        {/* Header */}
        <View className="flex-row bg-tf-elevated px-3 py-2.5 rounded-t-xl border border-tf-border">
          <Text className="flex-1 text-xs font-semibold text-txt-muted uppercase" style={{ letterSpacing: 1, minWidth: 120 }}>
            {groupLabel}
          </Text>
          <Text className="w-16 text-xs font-semibold text-txt-muted uppercase text-right" style={{ letterSpacing: 1 }}>
            Entries
          </Text>
          <Text className="w-20 text-xs font-semibold text-txt-muted uppercase text-right" style={{ letterSpacing: 1 }}>
            Duration
          </Text>
          <Text className="w-20 text-xs font-semibold text-txt-muted uppercase text-right" style={{ letterSpacing: 1 }}>
            Amount
          </Text>
        </View>

        {/* Rows */}
        {data.map((row, index) => (
          <View
            key={row.name}
            testID={`report-row-${index}`}
            className={`flex-row px-3 py-2.5 border-l border-r border-b border-tf-border ${
              index % 2 === 0 ? "bg-tf-card" : "bg-tf-elevated"
            }`}
          >
            <View className="flex-1 flex-row items-center" style={{ minWidth: 120 }}>
              {showColorDots && row.color && (
                <View
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: row.color }}
                />
              )}
              <Text className="text-sm text-txt-primary" numberOfLines={1}>
                {row.name}
              </Text>
            </View>
            <Text className="w-16 text-sm text-txt-secondary text-right font-mono">
              {row.entriesCount}
            </Text>
            <Text className="w-20 text-sm text-txt-primary text-right font-mono">
              {row.totalHours.toFixed(1)}h
            </Text>
            <Text className="w-20 text-sm text-txt-secondary text-right font-mono">
              {row.billableAmount > 0 ? `$${row.billableAmount.toFixed(2)}` : "—"}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
