/**
 * Tests for ColorSwatchPicker component logic.
 *
 * Since we're running in a node environment without React Native,
 * we test the selection and color matching logic.
 */

import { PROJECT_COLORS } from "@/constants/config";

/** Simulates the selection logic from ColorSwatchPicker. */
function getSwatchState(selectedColor: string, colors: string[] = PROJECT_COLORS) {
  return colors.map((color) => ({
    color,
    isSelected: color.toLowerCase() === selectedColor.toLowerCase(),
  }));
}

describe("ColorSwatchPicker logic", () => {
  it("should mark the selected color as selected", () => {
    const state = getSwatchState("#4A90D9");
    const selected = state.filter((s) => s.isSelected);
    expect(selected).toHaveLength(1);
    expect(selected[0].color).toBe("#4A90D9");
  });

  it("should mark only one color as selected", () => {
    const state = getSwatchState("#00d4aa");
    const selectedCount = state.filter((s) => s.isSelected).length;
    expect(selectedCount).toBe(1);
  });

  it("should handle case-insensitive comparison", () => {
    const state = getSwatchState("#4a90d9"); // lowercase
    const selected = state.filter((s) => s.isSelected);
    expect(selected).toHaveLength(1);
    expect(selected[0].color).toBe("#4A90D9");
  });

  it("should have no selected color for unknown value", () => {
    const state = getSwatchState("#000000");
    const selected = state.filter((s) => s.isSelected);
    expect(selected).toHaveLength(0);
  });

  it("should render exactly 16 swatches from PROJECT_COLORS", () => {
    const state = getSwatchState("#4A90D9");
    expect(state).toHaveLength(16);
  });

  it("should support custom color array", () => {
    const custom = ["#ff0000", "#00ff00", "#0000ff"];
    const state = getSwatchState("#00ff00", custom);
    expect(state).toHaveLength(3);

    const selected = state.filter((s) => s.isSelected);
    expect(selected).toHaveLength(1);
    expect(selected[0].color).toBe("#00ff00");
  });

  it("should show checkmark for the selected swatch", () => {
    const state = getSwatchState("#e74c3c");
    const dangerSwatch = state.find((s) => s.color === "#e74c3c");
    expect(dangerSwatch).toBeDefined();
    expect(dangerSwatch!.isSelected).toBe(true);

    // All others should not be selected
    const others = state.filter((s) => s.color !== "#e74c3c");
    for (const swatch of others) {
      expect(swatch.isSelected).toBe(false);
    }
  });

  it("should handle the first color in the list", () => {
    const state = getSwatchState(PROJECT_COLORS[0]);
    expect(state[0].isSelected).toBe(true);
  });

  it("should handle the last color in the list", () => {
    const lastColor = PROJECT_COLORS[PROJECT_COLORS.length - 1];
    const state = getSwatchState(lastColor);
    expect(state[state.length - 1].isSelected).toBe(true);
  });
});
