import { View, Text } from "react-native";
import { formatDuration } from "@/utils/time";

interface GrandTotalBarProps {
  totalEntries: number;
  totalSeconds: number;
  totalBillable?: number;
  className?: string;
}

export const GrandTotalBar = ({
  totalEntries,
  totalSeconds,
  totalBillable = 0,
  className = "",
}: GrandTotalBarProps) => {
  const hours = Math.round((totalSeconds / 3600) * 100) / 100;

  return (
    <View
      className={`flex-row items-center justify-between bg-tf-elevated border border-tf-border-strong rounded-xl px-4 py-3 ${className}`}
      style={{
        shadowColor: "#00d4aa",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      }}
    >
      <View className="flex-row items-center">
        <Text className="text-xs text-txt-muted uppercase font-semibold" style={{ letterSpacing: 1 }}>
          Total
        </Text>
      </View>

      <View className="flex-row items-center" style={{ gap: 16 }}>
        {totalEntries > 0 && (
          <View className="items-center">
            <Text className="text-xs text-txt-muted">Entries</Text>
            <Text className="text-sm font-mono font-semibold text-txt-primary">
              {totalEntries}
            </Text>
          </View>
        )}

        <View className="items-center">
          <Text className="text-xs text-txt-muted">Duration</Text>
          <Text className="text-sm font-mono font-bold text-accent">
            {hours.toFixed(1)}h
          </Text>
        </View>

        {totalBillable > 0 && (
          <View className="items-center">
            <Text className="text-xs text-txt-muted">Billable</Text>
            <Text className="text-sm font-mono font-semibold text-success">
              ${totalBillable.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
