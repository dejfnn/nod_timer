/**
 * Design tokens matching the NativeWind/Tailwind config.
 * Use this for programmatic access to colors (e.g., in Victory charts, inline styles).
 */
export const colors = {
  // Surface layers
  tf: {
    deep: "#0a0e1a",
    card: "#131829",
    elevated: "#1a2035",
    hover: "#222a45",
    border: "rgba(255, 255, 255, 0.06)",
    borderStrong: "rgba(255, 255, 255, 0.12)",
    borderAccent: "rgba(255, 255, 255, 0.18)",
  },

  // Brand & accent
  primary: {
    DEFAULT: "#4A90D9",
    hover: "#5a9fe8",
    muted: "rgba(74, 144, 217, 0.12)",
    glow: "rgba(74, 144, 217, 0.25)",
  },
  accent: {
    DEFAULT: "#00d4aa",
    hover: "#00e8bb",
    muted: "rgba(0, 212, 170, 0.10)",
    glow: "rgba(0, 212, 170, 0.20)",
    bright: "#33ffd4",
  },
  success: {
    DEFAULT: "#2ecc71",
    muted: "rgba(46, 204, 113, 0.12)",
  },
  danger: {
    DEFAULT: "#e74c3c",
    hover: "#f05a4a",
    muted: "rgba(231, 76, 60, 0.12)",
  },
  warning: {
    DEFAULT: "#f0a500",
    muted: "rgba(240, 165, 0, 0.12)",
  },

  // Text hierarchy
  text: {
    primary: "#e8eaed",
    secondary: "#9aa0b0",
    muted: "#5a6270",
    faint: "#3a4050",
  },
} as const;
