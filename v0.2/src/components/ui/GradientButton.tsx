import { Pressable, Text, View } from "react-native";

/**
 * Gradient-style start/stop button.
 *
 * Since React Native doesn't support CSS gradients natively without expo-linear-gradient,
 * this uses a solid color with shadow glow to achieve a premium feel.
 * Falls back to the Button accent/danger variants from the design system.
 */

interface GradientButtonProps {
  /** Button label text */
  label: string;
  /** Visual variant */
  variant: "start" | "stop";
  /** Press handler */
  onPress: () => void;
  /** Disable the button */
  disabled?: boolean;
  /** Optional icon node rendered before the label */
  icon?: React.ReactNode;
  className?: string;
}

const variants = {
  start: {
    bg: "#00d4aa",
    textColor: "#0a0e1a",
    shadowColor: "#00d4aa",
  },
  stop: {
    bg: "#e74c3c",
    textColor: "#ffffff",
    shadowColor: "#e74c3c",
  },
} as const;

export const GradientButton = ({
  label,
  variant,
  onPress,
  disabled = false,
  icon,
  className = "",
}: GradientButtonProps) => {
  const v = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`w-full rounded-2xl py-4 flex-row items-center justify-center ${disabled ? "opacity-50" : ""} ${className}`}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg,
          shadowColor: v.shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        },
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {icon && <View className="mr-2">{icon}</View>}
      <Text
        className="text-base font-bold"
        style={{ color: v.textColor, letterSpacing: 1 }}
      >
        {label}
      </Text>
    </Pressable>
  );
};
