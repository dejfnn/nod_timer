import { View, Text } from "react-native";

interface DayHeaderProps {
  /** Date string "YYYY-MM-DD" */
  date: string;
  /** Total seconds for this day */
  totalSeconds: number;
  /** Number of entries */
  entriesCount: number;
  className?: string;
}

/** Get a human-readable day name from "YYYY-MM-DD". */
function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

/** Format date as "Feb 28" style. */
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export const DayHeader = ({
  date,
  totalSeconds,
  entriesCount,
  className = "",
}: DayHeaderProps) => {
  const hours = Math.round((totalSeconds / 3600) * 100) / 100;

  return (
    <View
      className={`flex-row items-center justify-between bg-tf-elevated px-screen-x py-2.5 border-b border-tf-border ${className}`}
    >
      <View className="flex-row items-center">
        <Text className="text-sm font-semibold text-txt-primary">
          {getDayName(date)}
        </Text>
        <Text className="text-sm text-txt-muted ml-2">
          {formatShortDate(date)}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-xs text-txt-muted mr-3">
          {entriesCount} {entriesCount === 1 ? "entry" : "entries"}
        </Text>
        <Text className="text-sm font-mono font-semibold text-accent">
          {hours.toFixed(1)}h
        </Text>
      </View>
    </View>
  );
};
