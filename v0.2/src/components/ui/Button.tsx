import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { PressableProps } from "react-native";

/**
 * Premium button with multiple variants.
 *
 * - `primary`: solid blue, main CTA
 * - `accent`: teal glow, used for start/resume actions
 * - `ghost`: transparent with border, secondary actions
 * - `danger`: red, destructive actions
 * - `muted`: dim background, tertiary actions
 */

type ButtonVariant = "primary" | "accent" | "ghost" | "danger" | "muted";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string; pressedBg: string }
> = {
  primary: {
    container: "bg-primary border border-primary",
    text: "text-white font-semibold",
    pressedBg: "bg-primary-hover",
  },
  accent: {
    container: "bg-accent border border-accent shadow-glow",
    text: "text-tf-deep font-bold",
    pressedBg: "bg-accent-hover",
  },
  ghost: {
    container: "bg-transparent border border-tf-border-strong",
    text: "text-txt-secondary font-medium",
    pressedBg: "bg-tf-hover",
  },
  danger: {
    container: "bg-danger border border-danger",
    text: "text-white font-semibold",
    pressedBg: "bg-danger-hover",
  },
  muted: {
    container: "bg-tf-elevated border border-tf-border",
    text: "text-txt-secondary font-medium",
    pressedBg: "bg-tf-hover",
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: "px-3 py-1.5 rounded-lg", text: "text-xs" },
  md: { container: "px-4 py-2.5 rounded-xl", text: "text-sm" },
  lg: { container: "px-6 py-3.5 rounded-2xl", text: "text-base" },
};

export const Button = ({
  variant = "primary",
  size = "md",
  label,
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...rest
}: ButtonProps) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      className={`
        flex-row items-center justify-center
        ${s.container} ${v.container}
        ${fullWidth ? "w-full" : "self-start"}
        ${isDisabled ? "opacity-50" : ""}
        ${className}
      `}
      style={({ pressed }) => [
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "accent" ? "#0a0e1a" : "#ffffff"}
          className="mr-2"
        />
      ) : icon ? (
        <View className="mr-2">{icon}</View>
      ) : null}
      <Text className={`${s.text} ${v.text}`}>{label}</Text>
      {iconRight && <View className="ml-2">{iconRight}</View>}
    </Pressable>
  );
};

/** Circular icon-only button, e.g. for toolbar actions. */
export const IconButton = ({
  icon,
  size = 40,
  variant = "ghost",
  onPress,
  disabled,
  className = "",
}: {
  icon: React.ReactNode;
  size?: number;
  variant?: "ghost" | "muted";
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const bg = variant === "ghost" ? "bg-transparent" : "bg-tf-elevated";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-full ${bg} ${disabled ? "opacity-40" : ""} ${className}`}
      style={({ pressed }) => [
        { width: size, height: size },
        pressed && !disabled && { opacity: 0.7, transform: [{ scale: 0.9 }] },
      ]}
    >
      {icon}
    </Pressable>
  );
};
