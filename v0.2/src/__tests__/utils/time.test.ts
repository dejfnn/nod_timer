import {
  formatDuration,
  formatTimeShort,
  formatDate,
  getTodayRange,
  getWeekRange,
  getMonthRange,
  nowISO,
  diffSeconds,
} from "@/utils/time";

describe("Time utilities", () => {
  describe("formatDuration", () => {
    it('should format 0 seconds as "00:00:00"', () => {
      expect(formatDuration(0)).toBe("00:00:00");
    });

    it('should format 3661 seconds as "01:01:01"', () => {
      expect(formatDuration(3661)).toBe("01:01:01");
    });

    it("should format large values correctly", () => {
      expect(formatDuration(86400)).toBe("24:00:00"); // 24 hours
      expect(formatDuration(90061)).toBe("25:01:01"); // 25h 1m 1s
    });

    it("should handle negative values gracefully", () => {
      expect(formatDuration(-1)).toBe("00:00:00");
      expect(formatDuration(-3600)).toBe("00:00:00");
    });

    it("should handle decimal seconds (truncate)", () => {
      expect(formatDuration(3661.9)).toBe("01:01:01");
    });

    it("should handle Infinity", () => {
      expect(formatDuration(Infinity)).toBe("00:00:00");
    });

    it('should format 59 seconds as "00:00:59"', () => {
      expect(formatDuration(59)).toBe("00:00:59");
    });

    it('should format 60 seconds as "00:01:00"', () => {
      expect(formatDuration(60)).toBe("00:01:00");
    });

    it('should format 3600 seconds as "01:00:00"', () => {
      expect(formatDuration(3600)).toBe("01:00:00");
    });
  });

  describe("formatTimeShort", () => {
    it('should format ISO string to "HH:MM"', () => {
      expect(formatTimeShort("2024-01-15T09:05:00")).toBe("09:05");
    });

    it("should handle midnight", () => {
      expect(formatTimeShort("2024-01-15T00:00:00")).toBe("00:00");
    });

    it("should handle 23:59", () => {
      expect(formatTimeShort("2024-01-15T23:59:00")).toBe("23:59");
    });
  });

  describe("formatDate", () => {
    it('should format ISO string to "YYYY-MM-DD"', () => {
      expect(formatDate("2024-01-15T09:05:00")).toBe("2024-01-15");
    });

    it("should pad single-digit months and days", () => {
      expect(formatDate("2024-03-05T12:00:00")).toBe("2024-03-05");
    });
  });

  describe("getTodayRange", () => {
    it("should return start and end of today", () => {
      const { start, end } = getTodayRange();
      const now = new Date();
      const expectedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      expect(start).toContain(expectedDate);
      expect(start).toContain("T00:00:00");
      expect(end).toContain(expectedDate);
      expect(end).toContain("T23:59:59");
    });
  });

  describe("getWeekRange", () => {
    it("should return Monday to Sunday range", () => {
      const { start, end } = getWeekRange();

      // start should be a Monday
      const startDate = new Date(start);
      const day = startDate.getDay();
      expect(day).toBe(1); // Monday

      // end should be a Sunday
      const endDate = new Date(end);
      expect(endDate.getDay()).toBe(0); // Sunday

      // end should be 6 days after start
      const diffDays =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.floor(diffDays)).toBe(6);
    });
  });

  describe("getMonthRange", () => {
    it("should return first and last day of current month", () => {
      const { start, end } = getMonthRange();
      const now = new Date();

      expect(start).toContain("T00:00:00");
      // Should start on the 1st
      const startDate = new Date(start);
      expect(startDate.getDate()).toBe(1);

      // End should be last day of month
      const endDate = new Date(end);
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      expect(endDate.getDate()).toBe(lastDay);
    });
  });

  describe("nowISO", () => {
    it('should return current time as "YYYY-MM-DDTHH:MM:SS"', () => {
      const iso = nowISO();
      // Should match ISO-like format
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it("should be close to current time", () => {
      const now = new Date();
      const iso = nowISO();
      const parsed = new Date(iso);
      // Should be within 2 seconds
      expect(Math.abs(parsed.getTime() - now.getTime())).toBeLessThan(2000);
    });
  });

  describe("diffSeconds", () => {
    it("should calculate difference in seconds", () => {
      expect(
        diffSeconds("2024-01-01T09:00:00", "2024-01-01T10:00:00")
      ).toBe(3600);
    });

    it("should return 0 for equal times", () => {
      expect(
        diffSeconds("2024-01-01T09:00:00", "2024-01-01T09:00:00")
      ).toBe(0);
    });

    it("should return 0 for negative difference", () => {
      expect(
        diffSeconds("2024-01-01T10:00:00", "2024-01-01T09:00:00")
      ).toBe(0);
    });

    it("should handle multi-day differences", () => {
      expect(
        diffSeconds("2024-01-01T00:00:00", "2024-01-02T00:00:00")
      ).toBe(86400);
    });
  });
});
