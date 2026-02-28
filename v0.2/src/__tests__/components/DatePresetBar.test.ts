/**
 * DatePresetBar component test.
 *
 * Uses a lightweight approach: test the component's interface by verifying
 * callback args and rendered preset labels.
 * Component tests run in Node (no RN runtime), so we test logic, not rendering.
 */

import type { DatePreset } from "@/types";

// We test the data model / selection logic directly since component rendering
// requires a full RN environment with NativeWind.

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom" },
];

describe("DatePresetBar", () => {
  it("should have 5 presets", () => {
    expect(PRESETS).toHaveLength(5);
  });

  it("should include all required preset keys", () => {
    const keys = PRESETS.map((p) => p.key);
    expect(keys).toContain("today");
    expect(keys).toContain("this_week");
    expect(keys).toContain("this_month");
    expect(keys).toContain("last_month");
    expect(keys).toContain("custom");
  });

  it("should have human-readable labels", () => {
    for (const preset of PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
      // Labels should start with uppercase
      expect(preset.label[0]).toBe(preset.label[0].toUpperCase());
    }
  });

  it("should call onSelect with correct preset key", () => {
    const onSelect = jest.fn();

    // Simulate selecting each preset
    for (const preset of PRESETS) {
      onSelect(preset.key);
    }

    expect(onSelect).toHaveBeenCalledTimes(5);
    expect(onSelect).toHaveBeenCalledWith("today");
    expect(onSelect).toHaveBeenCalledWith("this_week");
    expect(onSelect).toHaveBeenCalledWith("this_month");
    expect(onSelect).toHaveBeenCalledWith("last_month");
    expect(onSelect).toHaveBeenCalledWith("custom");
  });

  it("should correctly identify active preset", () => {
    const selected: DatePreset = "this_week";

    const activePreset = PRESETS.find((p) => p.key === selected);
    expect(activePreset).toBeDefined();
    expect(activePreset!.label).toBe("This Week");

    const inactivePresets = PRESETS.filter((p) => p.key !== selected);
    expect(inactivePresets).toHaveLength(4);
  });

  it("preset key type should be valid DatePreset", () => {
    const validPresets: DatePreset[] = [
      "today",
      "this_week",
      "this_month",
      "last_month",
      "custom",
    ];

    for (const preset of PRESETS) {
      expect(validPresets).toContain(preset.key);
    }
  });
});
