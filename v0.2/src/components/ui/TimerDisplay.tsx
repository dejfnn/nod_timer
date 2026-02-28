import { View, Text } from "react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * Hero timer display — the centrepiece of the app.
 *
 * Features:
 * - Monospace tabular-nums digits for rock-solid alignment
 * - Pulsing teal glow when running
 * - Configurable size (xl for timer screen, lg for dashboard widget)
 */

interface TimerDisplayProps {
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Whether the timer is actively running — enables glow pulse */
  isRunning?: boolean;
  /** Display size variant */
  size?: "lg" | "xl";
  className?: string;
}

/** Format seconds → HH:MM:SS */
const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

export const TimerDisplay = ({
  elapsedSeconds,
  isRunning = false,
  size = "xl",
  className = "",
}: TimerDisplayProps) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRunning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isRunning, pulseAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.4],
  });

  const textClass =
    size === "xl" ? "text-timer-xl" : "text-timer-lg";

  const formatted = formatTime(elapsedSeconds);

  return (
    <View className={`items-center justify-center ${className}`}>
      {/* Glow backdrop when running */}
      {isRunning && (
        <Animated.View
          className="absolute rounded-3xl"
          style={{
            width: size === "xl" ? 320 : 240,
            height: size === "xl" ? 100 : 80,
            backgroundColor: "#00d4aa",
            opacity: glowOpacity,
            // Blur simulation via large border radius and spread
            transform: [{ scale: 1.3 }],
          }}
        />
      )}

      {/* Timer digits */}
      <Text
        className={`${textClass} font-mono text-txt-primary`}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatted}
      </Text>

      {/* Status indicator dot */}
      {isRunning && (
        <Animated.View
          className="mt-3 w-2 h-2 rounded-full bg-accent"
          style={{ opacity: glowOpacity }}
        />
      )}
    </View>
  );
};

/** Compact inline timer for list items and cards. */
export const InlineTimer = ({
  elapsedSeconds,
  isRunning = false,
}: {
  elapsedSeconds: number;
  isRunning?: boolean;
}) => (
  <Text
    className={`text-sm font-mono ${isRunning ? "text-accent" : "text-txt-secondary"}`}
    style={{ fontVariant: ["tabular-nums"] }}
  >
    {formatTime(elapsedSeconds)}
  </Text>
);
