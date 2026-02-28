/**
 * Tests for the notification service.
 *
 * We mock expo-notifications since it's not available in the test
 * environment. The tests verify that our service calls the correct
 * Expo Notifications APIs with the right parameters.
 */

// Set up the mock BEFORE importing the service
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  setNotificationHandler: mockSetNotificationHandler,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
}));

import {
  requestNotificationPermissions,
  scheduleTimerNotifications,
  cancelTimerNotifications,
} from "@/services/notifications";

describe("Notification service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestNotificationPermissions", () => {
    it("should return true when permissions are already granted", async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });

      const result = await requestNotificationPermissions();

      expect(result).toBe(true);
      expect(mockGetPermissionsAsync).toHaveBeenCalled();
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
      expect(mockSetNotificationHandler).toHaveBeenCalled();
    });

    it("should request permissions when not already granted", async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
      mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });

      const result = await requestNotificationPermissions();

      expect(result).toBe(true);
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
      expect(mockSetNotificationHandler).toHaveBeenCalled();
    });

    it("should return false when permissions are denied", async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
      mockRequestPermissionsAsync.mockResolvedValue({ status: "denied" });

      const result = await requestNotificationPermissions();

      expect(result).toBe(false);
      expect(mockSetNotificationHandler).not.toHaveBeenCalled();
    });

    it("should configure the notification handler correctly", async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });

      await requestNotificationPermissions();

      expect(mockSetNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          handleNotification: expect.any(Function),
        }),
      );

      // Verify the handler returns correct config
      const handler =
        mockSetNotificationHandler.mock.calls[0][0].handleNotification;
      const result = await handler();
      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      });
    });
  });

  describe("scheduleTimerNotifications", () => {
    it("should schedule 2-hour and 4-hour notifications", async () => {
      mockScheduleNotificationAsync.mockResolvedValue("mock-id");

      await scheduleTimerNotifications();

      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);

      // Check 2-hour notification
      const call2h = mockScheduleNotificationAsync.mock.calls[0];
      expect(call2h[0].identifier).toBe("timer-2h");
      expect(call2h[0].content.body).toBe("Timer running for 2 hours");
      expect(call2h[0].trigger.seconds).toBe(2 * 60 * 60);

      // Check 4-hour notification
      const call4h = mockScheduleNotificationAsync.mock.calls[1];
      expect(call4h[0].identifier).toBe("timer-4h");
      expect(call4h[0].content.body).toContain("4 hours");
      expect(call4h[0].trigger.seconds).toBe(4 * 60 * 60);
    });

    it("should not repeat the notifications", async () => {
      mockScheduleNotificationAsync.mockResolvedValue("mock-id");

      await scheduleTimerNotifications();

      const call2h = mockScheduleNotificationAsync.mock.calls[0];
      expect(call2h[0].trigger.repeats).toBe(false);

      const call4h = mockScheduleNotificationAsync.mock.calls[1];
      expect(call4h[0].trigger.repeats).toBe(false);
    });

    it("should set notification titles", async () => {
      mockScheduleNotificationAsync.mockResolvedValue("mock-id");

      await scheduleTimerNotifications();

      const call2h = mockScheduleNotificationAsync.mock.calls[0];
      expect(call2h[0].content.title).toBe("Timer Running");

      const call4h = mockScheduleNotificationAsync.mock.calls[1];
      expect(call4h[0].content.title).toBe("Timer Running");
    });
  });

  describe("cancelTimerNotifications", () => {
    it("should cancel both scheduled notifications", async () => {
      mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);

      await cancelTimerNotifications();

      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "timer-2h",
      );
      expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "timer-4h",
      );
    });
  });
});
