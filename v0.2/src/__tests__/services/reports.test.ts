import { createTestDb } from "../helpers/testDb";
import { createProject } from "@/models/project";
import { createClient } from "@/models/client";
import { createTag } from "@/models/tag";
import { createTimeEntry, addTags } from "@/models/timeEntry";
import {
  getEntriesInRange,
  summaryByProject,
  summaryByClient,
  summaryByDay,
  detailedReport,
  weeklyReport,
  calculateBillableAmount,
} from "@/services/reports";

/** Helper to create a local ISO date string. */
function localISO(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

describe("Reports service", () => {
  let db: any;
  let sqlite: any;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;
  });

  afterEach(() => {
    sqlite.close();
  });

  // -----------------------------------------------------------------------
  // calculateBillableAmount
  // -----------------------------------------------------------------------
  describe("calculateBillableAmount", () => {
    it("should return 0 when not billable", () => {
      expect(calculateBillableAmount(3600, 100, false)).toBe(0);
      expect(calculateBillableAmount(3600, 100, 0)).toBe(0);
    });

    it("should calculate correctly when billable", () => {
      // 1 hour at $100/hr = $100
      expect(calculateBillableAmount(3600, 100, true)).toBe(100);
      expect(calculateBillableAmount(3600, 100, 1)).toBe(100);
    });

    it("should handle partial hours", () => {
      // 30 min at $100/hr = $50
      expect(calculateBillableAmount(1800, 100, true)).toBe(50);
    });

    it("should round to 2 decimal places", () => {
      // 1/3 hour at $100/hr ≈ $33.33
      expect(calculateBillableAmount(1200, 100, true)).toBe(33.33);
    });

    it("should return 0 for zero rate", () => {
      expect(calculateBillableAmount(3600, 0, true)).toBe(0);
    });

    it("should return 0 for zero duration", () => {
      expect(calculateBillableAmount(0, 100, true)).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getEntriesInRange
  // -----------------------------------------------------------------------
  describe("getEntriesInRange", () => {
    it("should return empty array when no entries", async () => {
      const result = await getEntriesInRange(
        db,
        "2025-01-01T00:00:00",
        "2025-12-31T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should return only completed entries in range", async () => {
      // Entry in range (completed)
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        description: "In range",
      });

      // Entry in range (running — no stop time)
      await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        description: "Running",
      });

      // Entry out of range
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
        stopTime: "2024-01-01T10:00:00",
        durationSeconds: 3600,
        description: "Out of range",
      });

      const result = await getEntriesInRange(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("In range");
    });

    it("should filter by project", async () => {
      const projectA = await createProject(db, { name: "A" });
      const projectB = await createProject(db, { name: "B" });

      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        projectId: projectA.id,
      });

      await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        stopTime: "2025-06-15T12:00:00",
        durationSeconds: 3600,
        projectId: projectB.id,
      });

      const result = await getEntriesInRange(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
        { projectIds: [projectA.id] },
      );
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(projectA.id);
    });

    it("should filter by billable only", async () => {
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        billable: 1,
        description: "Billable",
      });

      await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        stopTime: "2025-06-15T12:00:00",
        durationSeconds: 3600,
        billable: 0,
        description: "Not billable",
      });

      const result = await getEntriesInRange(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
        { billableOnly: true },
      );
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Billable");
    });

    it("should filter by tag", async () => {
      const tag1 = await createTag(db, { name: "urgent" });
      const tag2 = await createTag(db, { name: "review" });

      const entry1 = await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        description: "Has urgent tag",
      });
      await addTags(db, entry1.id, [tag1.id]);

      const entry2 = await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        stopTime: "2025-06-15T12:00:00",
        durationSeconds: 3600,
        description: "Has review tag",
      });
      await addTags(db, entry2.id, [tag2.id]);

      const result = await getEntriesInRange(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
        { tagIds: [tag1.id] },
      );
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Has urgent tag");
    });
  });

  // -----------------------------------------------------------------------
  // summaryByProject
  // -----------------------------------------------------------------------
  describe("summaryByProject", () => {
    it("should return empty array when no entries", async () => {
      const result = await summaryByProject(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should group entries by project", async () => {
      const projectA = await createProject(db, {
        name: "Project A",
        color: "#ff0000",
      });
      const projectB = await createProject(db, {
        name: "Project B",
        color: "#00ff00",
      });

      // 2 entries for Project A (2 hours total)
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        projectId: projectA.id,
      });
      await createTimeEntry(db, {
        startTime: "2025-06-16T09:00:00",
        stopTime: "2025-06-16T10:00:00",
        durationSeconds: 3600,
        projectId: projectA.id,
      });

      // 1 entry for Project B (3 hours)
      await createTimeEntry(db, {
        startTime: "2025-06-17T09:00:00",
        stopTime: "2025-06-17T12:00:00",
        durationSeconds: 10800,
        projectId: projectB.id,
      });

      const result = await summaryByProject(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(2);

      // Sorted by total seconds descending, so B first
      expect(result[0].name).toBe("Project B");
      expect(result[0].entriesCount).toBe(1);
      expect(result[0].totalHours).toBe(3);
      expect(result[0].color).toBe("#00ff00");

      expect(result[1].name).toBe("Project A");
      expect(result[1].entriesCount).toBe(2);
      expect(result[1].totalHours).toBe(2);
      expect(result[1].color).toBe("#ff0000");
    });

    it("should handle entries without a project", async () => {
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
      });

      const result = await summaryByProject(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("No Project");
    });

    it("should calculate billable amounts", async () => {
      const project = await createProject(db, {
        name: "Billable Project",
        hourlyRate: 150,
        billable: 1,
      });

      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T11:00:00",
        durationSeconds: 7200,
        projectId: project.id,
        billable: 1,
      });

      const result = await summaryByProject(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].billableAmount).toBe(300); // 2h * $150
    });
  });

  // -----------------------------------------------------------------------
  // summaryByClient
  // -----------------------------------------------------------------------
  describe("summaryByClient", () => {
    it("should return empty array when no entries", async () => {
      const result = await summaryByClient(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should group by client", async () => {
      const clientA = await createClient(db, { name: "Client A" });
      const clientB = await createClient(db, { name: "Client B" });
      const projectA = await createProject(db, {
        name: "PA",
        clientId: clientA.id,
      });
      const projectB = await createProject(db, {
        name: "PB",
        clientId: clientB.id,
      });

      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        projectId: projectA.id,
      });

      await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        stopTime: "2025-06-15T13:00:00",
        durationSeconds: 7200,
        projectId: projectB.id,
      });

      const result = await summaryByClient(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(2);
      // Client B first (more hours)
      expect(result[0].name).toBe("Client B");
      expect(result[0].totalHours).toBe(2);
      expect(result[1].name).toBe("Client A");
      expect(result[1].totalHours).toBe(1);
    });

    it("should handle entries without a client", async () => {
      const project = await createProject(db, { name: "No Client Proj" });

      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        projectId: project.id,
      });

      const result = await summaryByClient(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("No Client");
    });
  });

  // -----------------------------------------------------------------------
  // summaryByDay
  // -----------------------------------------------------------------------
  describe("summaryByDay", () => {
    it("should return empty array when no entries", async () => {
      const result = await summaryByDay(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should group entries by date", async () => {
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
      });
      await createTimeEntry(db, {
        startTime: "2025-06-15T11:00:00",
        stopTime: "2025-06-15T12:00:00",
        durationSeconds: 3600,
      });
      await createTimeEntry(db, {
        startTime: "2025-06-16T09:00:00",
        stopTime: "2025-06-16T10:00:00",
        durationSeconds: 3600,
      });

      const result = await summaryByDay(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(2);
      // Sorted by date ascending
      expect(result[0].name).toBe("2025-06-15");
      expect(result[0].entriesCount).toBe(2);
      expect(result[0].totalHours).toBe(2);
      expect(result[1].name).toBe("2025-06-16");
      expect(result[1].entriesCount).toBe(1);
      expect(result[1].totalHours).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // detailedReport
  // -----------------------------------------------------------------------
  describe("detailedReport", () => {
    it("should return empty array when no entries", async () => {
      const result = await detailedReport(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should enrich entries with project/client/tag info", async () => {
      const client = await createClient(db, { name: "TestClient" });
      const project = await createProject(db, {
        name: "TestProject",
        color: "#abcdef",
        clientId: client.id,
        hourlyRate: 100,
        billable: 1,
      });
      const tag = await createTag(db, { name: "dev" });

      const entry = await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        projectId: project.id,
        billable: 1,
        description: "Test task",
      });
      await addTags(db, entry.id, [tag.id]);

      const result = await detailedReport(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(1);
      const r = result[0];
      expect(r.description).toBe("Test task");
      expect(r.projectName).toBe("TestProject");
      expect(r.projectColor).toBe("#abcdef");
      expect(r.clientName).toBe("TestClient");
      expect(r.billableAmount).toBe(100);
      expect(r.tags).toHaveLength(1);
      expect(r.tags[0].name).toBe("dev");
    });

    it("should handle entries without project/tags", async () => {
      await createTimeEntry(db, {
        startTime: "2025-06-15T09:00:00",
        stopTime: "2025-06-15T10:00:00",
        durationSeconds: 3600,
        description: "Bare entry",
      });

      const result = await detailedReport(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBeNull();
      expect(result[0].clientName).toBeNull();
      expect(result[0].tags).toHaveLength(0);
      expect(result[0].billableAmount).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // weeklyReport
  // -----------------------------------------------------------------------
  describe("weeklyReport", () => {
    it("should return empty array when no entries", async () => {
      const result = await weeklyReport(
        db,
        "2025-06-01T00:00:00",
        "2025-06-30T23:59:59",
      );
      expect(result).toHaveLength(0);
    });

    it("should pivot entries by project and day of week", async () => {
      const project = await createProject(db, {
        name: "WeekProj",
        color: "#123456",
      });

      // Monday June 16, 2025 — 2 hours
      await createTimeEntry(db, {
        startTime: "2025-06-16T09:00:00",
        stopTime: "2025-06-16T11:00:00",
        durationSeconds: 7200,
        projectId: project.id,
      });

      // Wednesday June 18, 2025 — 1 hour
      await createTimeEntry(db, {
        startTime: "2025-06-18T09:00:00",
        stopTime: "2025-06-18T10:00:00",
        durationSeconds: 3600,
        projectId: project.id,
      });

      const result = await weeklyReport(
        db,
        "2025-06-16T00:00:00",
        "2025-06-22T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe("WeekProj");
      // Mon=2h, Tue=0, Wed=1h, Thu-Sun=0
      expect(result[0].days[0]).toBe(2);
      expect(result[0].days[1]).toBe(0);
      expect(result[0].days[2]).toBe(1);
      expect(result[0].total).toBe(3);
    });

    it("should handle multiple projects", async () => {
      const projectA = await createProject(db, { name: "A" });
      const projectB = await createProject(db, { name: "B" });

      // Project A: Monday 1h
      await createTimeEntry(db, {
        startTime: "2025-06-16T09:00:00",
        stopTime: "2025-06-16T10:00:00",
        durationSeconds: 3600,
        projectId: projectA.id,
      });

      // Project B: Monday 2h
      await createTimeEntry(db, {
        startTime: "2025-06-16T10:00:00",
        stopTime: "2025-06-16T12:00:00",
        durationSeconds: 7200,
        projectId: projectB.id,
      });

      const result = await weeklyReport(
        db,
        "2025-06-16T00:00:00",
        "2025-06-22T23:59:59",
      );

      expect(result).toHaveLength(2);
      // B first (more total)
      expect(result[0].projectName).toBe("B");
      expect(result[0].total).toBe(2);
      expect(result[1].projectName).toBe("A");
      expect(result[1].total).toBe(1);
    });

    it("should handle entries without a project", async () => {
      await createTimeEntry(db, {
        startTime: "2025-06-16T09:00:00",
        stopTime: "2025-06-16T10:00:00",
        durationSeconds: 3600,
      });

      const result = await weeklyReport(
        db,
        "2025-06-16T00:00:00",
        "2025-06-22T23:59:59",
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe("No Project");
    });
  });
});
