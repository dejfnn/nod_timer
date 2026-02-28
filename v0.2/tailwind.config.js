/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Surface layers (deep → card → elevated → hover)
        tf: {
          deep: "#0a0e1a",
          card: "#131829",
          elevated: "#1a2035",
          hover: "#222a45",
          border: "rgba(255, 255, 255, 0.06)",
          "border-strong": "rgba(255, 255, 255, 0.12)",
          "border-accent": "rgba(255, 255, 255, 0.18)",
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
        "txt-primary": "#e8eaed",
        "txt-secondary": "#9aa0b0",
        "txt-muted": "#5a6270",
        "txt-faint": "#3a4050",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // Timer display
        "timer-xl": ["56px", { lineHeight: "1", letterSpacing: "4px" }],
        "timer-lg": ["42px", { lineHeight: "1", letterSpacing: "3px" }],
        // Metrics
        "metric-value": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        // Section labels (Linear-style)
        "section-label": [
          "11px",
          { lineHeight: "1", letterSpacing: "1.5px", fontWeight: "600" },
        ],
        // Caption
        xs: ["11px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        pill: "9999px",
      },
      spacing: {
        // Named spacing for consistency
        "screen-x": "20px",
        "card-p": "16px",
        "section-gap": "24px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 170, 0.15), 0 0 40px rgba(0, 212, 170, 0.05)",
        "glow-strong":
          "0 0 30px rgba(0, 212, 170, 0.25), 0 0 60px rgba(0, 212, 170, 0.08)",
        card: "0 2px 8px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
