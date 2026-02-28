import { View, Text } from "react-native";
import { Card } from "@/components/ui";

/**
 * Metric card with colored top border for dashboard stats.
 *
 * Displays:
 * - Icon + label at the top
 * - Large formatted value (e.g. "02:34:10")
 * - Decimal hours subtitle
 */

interface MetricCardProps {
  /** Label text (e.g. "Today") */
  label: string;
  /** Large display value (e.g. "02:34:10") */
  value: string;
  /** Subtitle text (e.g. "2.57 hours") */
  subtitle?: string;
  /** Icon node rendered next to the label */
  icon?: React.ReactNode;
  /** Top border color (hex) */
  borderColor?: string;
  className?: string;
}

export const MetricCard = ({
  label,
  value,
  subtitle,
  icon,
  borderColor = "#4A90D9",
  className = "",
}: MetricCardProps) => {
  return (
    <Card
      className={`w-[160px] mr-3 ${className}`}
      style={{ borderTopWidth: 3, borderTopColor: borderColor }}
    >
      {/* Label row */}
      <View className="flex-row items-center mb-2">
        {icon && <View className="mr-1.5">{icon}</View>}
        <Text className="text-xs text-txt-muted uppercase font-semibold">
          {label}
        </Text>
      </View>

      {/* Value */}
      <Text
        className="text-metric-value text-txt-primary font-bold"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>

      {/* Subtitle */}
      {subtitle && (
        <Text className="text-xs text-txt-secondary mt-1">{subtitle}</Text>
      )}
    </Card>
  );
};
