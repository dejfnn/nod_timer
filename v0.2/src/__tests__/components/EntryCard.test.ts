/**
 * Tests for EntryCard component logic.
 *
 * Since we're running in a node environment without React Native,
 * we test the data processing logic that the component relies on.
 */

import { formatDuration, formatTimeShort } from "@/utils/time";
import type { TimeEntry, Project, Tag } from "@/types";

/** Simulates the display logic from EntryCard. */
function getEntryDisplayData(
  entry: TimeEntry,
  project?: Project | null,
  tags?: Tag[],
) {
  const projectColor = project?.color ?? "#4A90D9";
  const duration = entry.durationSeconds ?? 0;
  const description = entry.description || "No description";

  const timeRange =
    entry.startTime && entry.stopTime
      ? `${formatTimeShort(entry.startTime)} - ${formatTimeShort(entry.stopTime)}`
      : entry.startTime
        ? `${formatTimeShort(entry.startTime)} - running`
        : "";

  return {
    projectColor,
    duration: formatDuration(duration),
    description,
    timeRange,
    tagCount: tags?.length ?? 0,
  };
}

describe("EntryCard display logic", () => {
  const baseEntry: TimeEntry = {
    id: 1,
    description: "Working on feature",
    projectId: 1,
    startTime: "2024-01-15T09:00:00",
    stopTime: "2024-01-15T10:30:00",
    durationSeconds: 5400,
    billable: 0,
    createdAt: "2024-01-15T09:00:00",
    updatedAt: null,
  };

  const testProject: Project = {
    id: 1,
    name: "TimeFlow",
    color: "#00d4aa",
    clientId: null,
    billable: 0,
    hourlyRate: 0,
    archived: 0,
    createdAt: "2024-01-01T00:00:00",
    updatedAt: null,
  };

  const testTags: Tag[] = [
    { id: 1, name: "urgent", createdAt: "2024-01-01T00:00:00" },
    { id: 2, name: "bugfix", createdAt: "2024-01-01T00:00:00" },
  ];

  it("should display entry description", () => {
    const data = getEntryDisplayData(baseEntry, testProject, testTags);
    expect(data.description).toBe("Working on feature");
  });

  it("should show 'No description' for empty description", () => {
    const entry = { ...baseEntry, description: "" };
    const data = getEntryDisplayData(entry);
    expect(data.description).toBe("No description");
  });

  it("should format duration correctly", () => {
    const data = getEntryDisplayData(baseEntry);
    expect(data.duration).toBe("01:30:00");
  });

  it("should handle zero duration", () => {
    const entry = { ...baseEntry, durationSeconds: 0 };
    const data = getEntryDisplayData(entry);
    expect(data.duration).toBe("00:00:00");
  });

  it("should handle null duration", () => {
    const entry = { ...baseEntry, durationSeconds: null };
    const data = getEntryDisplayData(entry);
    expect(data.duration).toBe("00:00:00");
  });

  it("should use project color when project is provided", () => {
    const data = getEntryDisplayData(baseEntry, testProject);
    expect(data.projectColor).toBe("#00d4aa");
  });

  it("should use default color when no project", () => {
    const data = getEntryDisplayData(baseEntry, null);
    expect(data.projectColor).toBe("#4A90D9");
  });

  it("should format time range for completed entries", () => {
    const data = getEntryDisplayData(baseEntry);
    expect(data.timeRange).toBe("09:00 - 10:30");
  });

  it("should show 'running' for active entries", () => {
    const entry = { ...baseEntry, stopTime: null, durationSeconds: null };
    const data = getEntryDisplayData(entry);
    expect(data.timeRange).toBe("09:00 - running");
  });

  it("should count tags correctly", () => {
    const data = getEntryDisplayData(baseEntry, testProject, testTags);
    expect(data.tagCount).toBe(2);
  });

  it("should handle no tags", () => {
    const data = getEntryDisplayData(baseEntry, testProject, []);
    expect(data.tagCount).toBe(0);
  });

  it("should handle undefined tags", () => {
    const data = getEntryDisplayData(baseEntry, testProject);
    expect(data.tagCount).toBe(0);
  });
});
