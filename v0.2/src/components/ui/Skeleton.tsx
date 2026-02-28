import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

/**
 * Loading skeleton placeholder with shimmer animation.
 *
 * Variants:
 * - `line`: horizontal text placeholder (default)
 * - `card`: rectangular card placeholder
 * - `circle`: circular avatar/icon placeholder
 */

type SkeletonVariant = "line" | "card" | "circle";

interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width — number (px) or string (e.g., "100%") */
  width?: number | string;
  /** Height — number (px) */
  height?: number;
  /** Border radius override */
  borderRadius?: number;
  /** Additional className */
  className?: string;
}

const defaultDimensions: Record<
  SkeletonVariant,
  { width: number | string; height: number; borderRadius: number }
> = {
  line: { width: "100%", height: 14, borderRadius: 7 },
  card: { width: "100%", height: 100, borderRadius: 16 },
  circle: { width: 40, height: 40, borderRadius: 20 },
};

export const Skeleton = ({
  variant = "line",
  width,
  height,
  borderRadius,
  className = "",
}: SkeletonProps) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const defaults = defaultDimensions[variant];

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View className={className}>
      <Animated.View
        style={{
          width: width ?? defaults.width,
          height: height ?? defaults.height,
          borderRadius: borderRadius ?? defaults.borderRadius,
          backgroundColor: "#1a2035",
          opacity,
        }}
      />
    </View>
  );
};

/** Pre-composed skeleton for a metric card. */
export const SkeletonMetricCard = () => (
  <View
    style={{
      width: 140,
      marginRight: 12,
      padding: 16,
      backgroundColor: "#131829",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.06)",
    }}
  >
    <Skeleton variant="line" width={60} height={10} />
    <View style={{ marginTop: 12 }}>
      <Skeleton variant="line" width={100} height={22} />
    </View>
    <View style={{ marginTop: 8 }}>
      <Skeleton variant="line" width={70} height={10} />
    </View>
  </View>
);

/** Pre-composed skeleton for a list item card. */
export const SkeletonCard = () => (
  <View
    style={{
      padding: 16,
      backgroundColor: "#131829",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.06)",
      marginBottom: 8,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Skeleton variant="circle" width={10} height={10} borderRadius={5} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Skeleton variant="line" width="70%" height={14} />
      </View>
      <Skeleton variant="line" width={60} height={14} />
    </View>
  </View>
);
