/**
 * Custom tab bar appearance tokens.
 *
 * Used by Expo Router's <Tabs> screenOptions to achieve
 * the Obsidian Chronograph premium bottom navigation look.
 */

export const TAB_BAR_THEME = {
  /** Tab bar background — matches deep surface */
  backgroundColor: "#0a0e1a",
  /** Top border for subtle separation */
  borderTopColor: "rgba(255, 255, 255, 0.06)",
  borderTopWidth: 1,
  /** Active tab icon & label */
  activeTintColor: "#00d4aa",
  /** Inactive tab icon & label */
  inactiveTintColor: "#5a6270",
  /** Tab bar height (accounts for safe area internally) */
  height: 64,
  /** Label styling */
  labelStyle: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    marginTop: -2,
  },
  /** Icon size */
  iconSize: 22,
} as const;

/**
 * Returns Expo Router <Tabs> screenOptions for the custom tab bar.
 *
 * Usage in app/(tabs)/_layout.tsx:
 * ```tsx
 * import { getTabScreenOptions } from "@/components/ui/TabBarTheme";
 * <Tabs screenOptions={getTabScreenOptions()}>
 * ```
 */
export const getTabScreenOptions = () => ({
  tabBarStyle: {
    backgroundColor: TAB_BAR_THEME.backgroundColor,
    borderTopColor: TAB_BAR_THEME.borderTopColor,
    borderTopWidth: TAB_BAR_THEME.borderTopWidth,
    height: TAB_BAR_THEME.height,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarActiveTintColor: TAB_BAR_THEME.activeTintColor,
  tabBarInactiveTintColor: TAB_BAR_THEME.inactiveTintColor,
  tabBarLabelStyle: TAB_BAR_THEME.labelStyle,
  tabBarIconStyle: {
    width: TAB_BAR_THEME.iconSize,
    height: TAB_BAR_THEME.iconSize,
  },
  headerStyle: {
    backgroundColor: TAB_BAR_THEME.backgroundColor,
    borderBottomColor: TAB_BAR_THEME.borderTopColor,
    borderBottomWidth: TAB_BAR_THEME.borderTopWidth,
  },
  headerTintColor: "#e8eaed",
  headerTitleStyle: {
    fontWeight: "600" as const,
    fontSize: 17,
  },
});
