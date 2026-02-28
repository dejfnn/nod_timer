import { View, Text } from "react-native";

/**
 * Pill-shaped badge for status indicators, tags, and labels.
 *
 * - `default`: muted background, secondary text
 * - `active`: accent teal with subtle glow
 * - `info`: primary blue
 * - `success`: green
 * - `danger`: red
 * - `warning`: orange/yellow
 * - `custom`: pass `color` prop for custom background tint
 */

type BadgeVariant =
  | "default"
  | "active"
  | "info"
  | "success"
  | "danger"
  | "warning"
  | "custom";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Hex color for custom variant background tint */
  color?: string;
  /** Render a small dot before the label */
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const variantClasses: Record<
  Exclude<BadgeVariant, "custom">,
  { bg: string; text: string; dot: string }
> = {
  default: {
    bg: "bg-tf-elevated",
    text: "text-txt-secondary",
    dot: "bg-txt-muted",
  },
  active: {
    bg: "bg-accent-muted",
    text: "text-accent",
    dot: "bg-accent",
  },
  info: {
    bg: "bg-primary-muted",
    text: "text-primary",
    dot: "bg-primary",
  },
  success: {
    bg: "bg-success-muted",
    text: "text-success",
    dot: "bg-success",
  },
  danger: {
    bg: "bg-danger-muted",
    text: "text-danger",
    dot: "bg-danger",
  },
  warning: {
    bg: "bg-warning-muted",
    text: "text-warning",
    dot: "bg-warning",
  },
};

export const Badge = ({
  label,
  variant = "default",
  color,
  dot = false,
  size = "sm",
  className = "",
}: BadgeProps) => {
  const isCustom = variant === "custom" && color;
  const v = isCustom ? null : variantClasses[variant as Exclude<BadgeVariant, "custom">];

  const padClass = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <View
      className={`flex-row items-center rounded-pill ${padClass} ${v?.bg ?? ""} ${className}`}
      style={isCustom ? { backgroundColor: color + "1a" } : undefined}
    >
      {dot && (
        <View
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${v?.dot ?? ""}`}
          style={isCustom ? { backgroundColor: color } : undefined}
        />
      )}
      <Text
        className={`${textSize} font-medium ${v?.text ?? ""}`}
        style={isCustom ? { color } : undefined}
      >
        {label}
      </Text>
    </View>
  );
};
