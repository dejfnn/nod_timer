import { Pressable, View } from "react-native";
import type { ViewProps } from "react-native";

/** Glass-morphism card with layered surface depth.
 *
 * Variants:
 * - `surface` (default): standard card background
 * - `elevated`: slightly lighter, for nested cards or modals
 * - `accent`: left border accent color (pass `accentColor` prop)
 * - `interactive`: pressable with subtle scale feedback
 */

type CardVariant = "surface" | "elevated" | "accent" | "interactive";

interface CardProps extends ViewProps {
  variant?: CardVariant;
  /** Hex color for left border when variant="accent" */
  accentColor?: string;
  /** Press handler — automatically makes card interactive */
  onPress?: () => void;
  children: React.ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  surface: "bg-tf-card border border-tf-border",
  elevated: "bg-tf-elevated border border-tf-border-strong",
  accent: "bg-tf-card border border-tf-border",
  interactive: "bg-tf-card border border-tf-border active:bg-tf-hover",
};

export const Card = ({
  variant = "surface",
  accentColor,
  onPress,
  children,
  className = "",
  style,
  ...rest
}: CardProps) => {
  const base = `rounded-2xl p-card-p shadow-card ${variantClasses[variant]}`;

  const accentStyle =
    variant === "accent" && accentColor
      ? { borderLeftWidth: 4, borderLeftColor: accentColor }
      : undefined;

  const combinedStyle = accentStyle
    ? style
      ? [accentStyle, style]
      : accentStyle
    : style;

  if (onPress || variant === "interactive") {
    return (
      <Pressable
        onPress={onPress}
        className={`${base} ${className}`}
        style={({ pressed }) => [
          combinedStyle as any,
          pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${base} ${className}`} style={combinedStyle} {...rest}>
      {children}
    </View>
  );
};
