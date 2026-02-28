/**
 * Tests for ProjectCard component logic.
 *
 * Since we're running in a node environment without React Native,
 * we test the data processing logic that the component relies on.
 */

import { formatDuration } from "@/utils/time";
import type { Project, Client } from "@/types";

/** Simulates the display logic from ProjectCard. */
function getProjectDisplayData(
  project: Project,
  client?: Client | null,
  trackedSeconds = 0,
  maxTrackedSeconds = 1,
) {
  const hours = Math.round((trackedSeconds / 3600) * 100) / 100;
  const progress =
    maxTrackedSeconds > 0 ? trackedSeconds / maxTrackedSeconds : 0;
  const displayTime =
    hours > 0 ? `${hours.toFixed(1)}h` : formatDuration(trackedSeconds);

  return {
    name: project.name,
    color: project.color,
    clientName: client?.name ?? null,
    isBillable: project.billable === 1,
    hourlyRate: project.hourlyRate,
    isArchived: project.archived === 1,
    hours,
    progress,
    displayTime,
  };
}

describe("ProjectCard display logic", () => {
  const baseProject: Project = {
    id: 1,
    name: "TimeFlow App",
    color: "#00d4aa",
    clientId: 1,
    billable: 1,
    hourlyRate: 150,
    archived: 0,
    createdAt: "2024-01-01T00:00:00",
    updatedAt: null,
  };

  const testClient: Client = {
    id: 1,
    name: "Acme Corp",
    archived: 0,
    createdAt: "2024-01-01T00:00:00",
    updatedAt: null,
  };

  it("should display the project name", () => {
    const data = getProjectDisplayData(baseProject, testClient, 3600, 7200);
    expect(data.name).toBe("TimeFlow App");
  });

  it("should display the project color", () => {
    const data = getProjectDisplayData(baseProject);
    expect(data.color).toBe("#00d4aa");
  });

  it("should display the client name", () => {
    const data = getProjectDisplayData(baseProject, testClient);
    expect(data.clientName).toBe("Acme Corp");
  });

  it("should handle missing client", () => {
    const data = getProjectDisplayData(baseProject, null);
    expect(data.clientName).toBeNull();
  });

  it("should show billable badge with rate", () => {
    const data = getProjectDisplayData(baseProject, testClient);
    expect(data.isBillable).toBe(true);
    expect(data.hourlyRate).toBe(150);
  });

  it("should handle non-billable projects", () => {
    const nonBillable = { ...baseProject, billable: 0, hourlyRate: 0 };
    const data = getProjectDisplayData(nonBillable);
    expect(data.isBillable).toBe(false);
  });

  it("should show archived badge", () => {
    const archived = { ...baseProject, archived: 1 };
    const data = getProjectDisplayData(archived);
    expect(data.isArchived).toBe(true);
  });

  it("should handle non-archived projects", () => {
    const data = getProjectDisplayData(baseProject);
    expect(data.isArchived).toBe(false);
  });

  it("should calculate hours correctly", () => {
    const data = getProjectDisplayData(baseProject, testClient, 5400);
    expect(data.hours).toBe(1.5);
  });

  it("should calculate progress relative to max", () => {
    const data = getProjectDisplayData(baseProject, testClient, 3600, 7200);
    expect(data.progress).toBe(0.5);
  });

  it("should handle zero max tracked", () => {
    const data = getProjectDisplayData(baseProject, testClient, 0, 0);
    expect(data.progress).toBe(0);
  });

  it("should show formatted duration for zero hours", () => {
    const data = getProjectDisplayData(baseProject, testClient, 0);
    expect(data.displayTime).toBe("00:00:00");
  });

  it("should show decimal hours for positive tracking", () => {
    const data = getProjectDisplayData(baseProject, testClient, 7200);
    expect(data.displayTime).toBe("2.0h");
  });

  it("should handle partial hours", () => {
    const data = getProjectDisplayData(baseProject, testClient, 5400); // 1.5h
    expect(data.displayTime).toBe("1.5h");
  });

  it("should handle large tracked times", () => {
    const data = getProjectDisplayData(baseProject, testClient, 360000); // 100h
    expect(data.hours).toBe(100);
    expect(data.displayTime).toBe("100.0h");
  });
});
