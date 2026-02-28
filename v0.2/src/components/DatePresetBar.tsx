import { ScrollView, Pressable, Text } from "react-native";
import type { DatePreset } from "@/types";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom" },
];

interface DatePresetBarProps {
  selected: DatePreset;
  onSelect: (preset: DatePreset) => void;
  className?: string;
}

export const DatePresetBar = ({
  selected,
  onSelect,
  className = "",
}: DatePresetBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className={`flex-row ${className}`}
    contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
  >
    {PRESETS.map((preset) => {
      const isActive = selected === preset.key;
      return (
        <Pressable
          key={preset.key}
          onPress={() => onSelect(preset.key)}
          testID={`preset-${preset.key}`}
          className={`px-4 py-2 rounded-pill border ${
            isActive
              ? "bg-accent border-accent"
              : "bg-tf-elevated border-tf-border"
          }`}
          style={({ pressed }) => [
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text
            className={`text-sm font-semibold ${
              isActive ? "text-tf-deep" : "text-txt-secondary"
            }`}
          >
            {preset.label}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);
