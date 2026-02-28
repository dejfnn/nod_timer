/**
 * Local notification service for long-running timer alerts.
 *
 * Schedules notifications at 2h and 4h when a timer is running,
 * and cancels them when the timer stops.
 */

// Notification identifiers for scheduled timer alerts
const NOTIFICATION_2H_ID = "timer-2h";
const NOTIFICATION_4H_ID = "timer-4h";

/**
 * Request notification permissions from the user.
 * Returns true if permissions were granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const Notifications = require("expo-notifications");

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    // Configure notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    return true;
  } catch {
    // Not available in this environment (tests, web, etc.)
    console.warn("Notifications not available in this environment");
    return false;
  }
}

/**
 * Schedule timer-running notifications at 2h and 4h from now.
 * Call this when a timer starts.
 */
export async function scheduleTimerNotifications(): Promise<void> {
  try {
    const Notifications = require("expo-notifications");

    // Schedule 2-hour notification
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_2H_ID,
      content: {
        title: "Timer Running",
        body: "Timer running for 2 hours",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2 * 60 * 60, // 2 hours
        repeats: false,
      },
    });

    // Schedule 4-hour notification
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_4H_ID,
      content: {
        title: "Timer Running",
        body: "Timer running for 4 hours \u2014 forgot to stop?",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 4 * 60 * 60, // 4 hours
        repeats: false,
      },
    });
  } catch {
    console.warn("Failed to schedule timer notifications");
  }
}

/**
 * Cancel all scheduled timer notifications.
 * Call this when a timer stops.
 */
export async function cancelTimerNotifications(): Promise<void> {
  try {
    const Notifications = require("expo-notifications");

    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_2H_ID);
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_4H_ID);
  } catch {
    console.warn("Failed to cancel timer notifications");
  }
}
