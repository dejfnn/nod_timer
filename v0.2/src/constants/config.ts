/** Application name. */
export const APP_NAME = "TimeFlow";

/** Application version. */
export const APP_VERSION = "0.2.0";

/** Default datetime format used in DB and display. */
export const DATETIME_FORMAT = "YYYY-MM-DDTHH:MM:SS";

/** Default color for new projects. */
export const DEFAULT_PROJECT_COLOR = "#4A90D9";

/** Preset project colors (16 colors for the 4x4 swatch picker). */
export const PROJECT_COLORS: string[] = [
  "#4A90D9", // Blue (primary)
  "#00d4aa", // Teal (accent)
  "#2ecc71", // Green (success)
  "#e74c3c", // Red (danger)
  "#f0a500", // Amber (warning)
  "#9b59b6", // Purple
  "#e91e63", // Pink
  "#00bcd4", // Cyan
  "#ff5722", // Deep Orange
  "#795548", // Brown
  "#607d8b", // Blue Grey
  "#8bc34a", // Light Green
  "#ff9800", // Orange
  "#3f51b5", // Indigo
  "#009688", // Teal dark
  "#cddc39", // Lime
];

/** Default working hours per day (used for capacity calculation). */
export const DEFAULT_WORKING_HOURS = 8.0;
