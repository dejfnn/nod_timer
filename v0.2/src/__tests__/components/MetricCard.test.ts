/**
 * Tests for MetricCard component logic.
 *
 * Since we're running in a node environment without React Native,
 * we test the data processing logic that the component relies on.
 */

import { formatDuration } from "@/utils/time";

/** Simulates the display logic from MetricCard. */
function getMetricDisplayData(params: {
  label: string;
  totalSeconds: number;
  borderColor?: string;
}) {
  const value = formatDuration(params.totalSeconds);
  const decimalHours = (params.totalSeconds / 3600).toFixed(2);
  const subtitle = `${decimalHours} hours`;
  const borderColor = params.borderColor ?? "#4A90D9";

  return {
    label: params.label,
    value,
    subtitle,
    borderColor,
  };
}

describe("MetricCard display logic", () => {
  it("should render the label", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 3600,
    });
    expect(data.label).toBe("Today");
  });

  it("should format duration as value", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 5400,
    });
    expect(data.value).toBe("01:30:00");
  });

  it("should show decimal hours as subtitle", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 5400,
    });
    expect(data.subtitle).toBe("1.50 hours");
  });

  it("should use default border color when not provided", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 0,
    });
    expect(data.borderColor).toBe("#4A90D9");
  });

  it("should use custom border color when provided", () => {
    const data = getMetricDisplayData({
      label: "This Week",
      totalSeconds: 0,
      borderColor: "#00d4aa",
    });
    expect(data.borderColor).toBe("#00d4aa");
  });

  it("should handle zero seconds", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 0,
    });
    expect(data.value).toBe("00:00:00");
    expect(data.subtitle).toBe("0.00 hours");
  });

  it("should handle large values", () => {
    const data = getMetricDisplayData({
      label: "This Month",
      totalSeconds: 360000, // 100 hours
    });
    expect(data.value).toBe("100:00:00");
    expect(data.subtitle).toBe("100.00 hours");
  });

  it("should calculate decimal hours correctly", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 9000, // 2.5 hours
    });
    expect(data.subtitle).toBe("2.50 hours");
  });

  it("should handle 1 second", () => {
    const data = getMetricDisplayData({
      label: "Today",
      totalSeconds: 1,
    });
    expect(data.value).toBe("00:00:01");
    expect(data.subtitle).toBe("0.00 hours");
  });
});
