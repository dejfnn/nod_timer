import { View } from "react-native";

/**
 * Slim progress bar with customizable color and optional glow effect.
 * Used for capacity bars, daily goal tracking, etc.
 */

interface ProgressBarProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Color of the filled portion (default: accent teal) */
  color?: string;
  /** Height in pixels (default: 4) */
  height?: number;
  /** Enable subtle glow on the filled portion */
  glow?: boolean;
  className?: string;
}

export const ProgressBar = ({
  progress,
  color = "#00d4aa",
  height = 4,
  glow = false,
  className = "",
}: ProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View
      className={`w-full bg-tf-elevated rounded-pill overflow-hidden ${className}`}
      style={{ height }}
    >
      <View
        className="h-full rounded-pill"
        style={{
          width: `${clampedProgress * 100}%`,
          backgroundColor: color,
          ...(glow
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 6,
              }
            : {}),
        }}
      />
    </View>
  );
};
