import { createTestDb } from "../helpers/testDb";
import { createProject } from "@/models/project";
import { createTimeEntry } from "@/models/timeEntry";
import {
  getTodayTotal,
  getWeekTotal,
  getMonthTotal,
  getLast7Days,
  getProjectDistribution,
  getRecentEntries,
  getMostTrackedProject,
} from "@/services/dashboard";

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

describe("Dashboard service", () => {
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

  describe("getTodayTotal", () => {
    it("should return 0 when no entries exist", async () => {
      const total = await getTodayTotal(db);
      expect(total).toBe(0);
    });

    it("should sum today's completed entries", async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(todayStart),
        stopTime: localISO(todayEnd),
        durationSeconds: 3600,
        description: "Work session",
      });

      const total = await getTodayTotal(db);
      expect(total).toBe(3600);
    });

    it("should not count entries without stop time", async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(todayStart),
        description: "Running entry",
      });

      const total = await getTodayTotal(db);
      expect(total).toBe(0);
    });

    it("should not count entries from other days", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0, 0);
      const yEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 10, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(yStart),
        stopTime: localISO(yEnd),
        durationSeconds: 3600,
        description: "Yesterday work",
      });

      const total = await getTodayTotal(db);
      expect(total).toBe(0);
    });
  });

  describe("getWeekTotal", () => {
    it("should return 0 when no entries exist", async () => {
      const total = await getWeekTotal(db);
      expect(total).toBe(0);
    });

    it("should sum this week's completed entries", async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(todayStart),
        stopTime: localISO(todayEnd),
        durationSeconds: 7200,
        description: "This week work",
      });

      const total = await getWeekTotal(db);
      expect(total).toBe(7200);
    });
  });

  describe("getMonthTotal", () => {
    it("should return 0 when no entries exist", async () => {
      const total = await getMonthTotal(db);
      expect(total).toBe(0);
    });

    it("should sum this month's completed entries", async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        stopTime: localISO(end),
        durationSeconds: 10800,
        description: "Start of month work",
      });

      const total = await getMonthTotal(db);
      expect(total).toBe(10800);
    });
  });

  describe("getLast7Days", () => {
    it("should return 7 entries", async () => {
      const result = await getLast7Days(db);
      expect(result).toHaveLength(7);
    });

    it("should have date and hours for each day", async () => {
      const result = await getLast7Days(db);
      for (const day of result) {
        expect(day).toHaveProperty("date");
        expect(day).toHaveProperty("hours");
        expect(typeof day.date).toBe("string");
        expect(typeof day.hours).toBe("number");
      }
    });

    it("should show hours for today", async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(todayStart),
        stopTime: localISO(todayEnd),
        durationSeconds: 7200,
      });

      const result = await getLast7Days(db);
      // Today is the last element in the array
      const todayData = result[result.length - 1];
      expect(todayData.hours).toBe(2);
    });

    it("should return 0 hours for days without entries", async () => {
      const result = await getLast7Days(db);
      for (const day of result) {
        expect(day.hours).toBe(0);
      }
    });
  });

  describe("getProjectDistribution", () => {
    it("should return empty array when no entries", async () => {
      const result = await getProjectDistribution(db);
      expect(result).toHaveLength(0);
    });

    it("should group by project with hours and colors", async () => {
      const project = await createProject(db, {
        name: "Project A",
        color: "#ff0000",
      });

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        stopTime: localISO(end),
        durationSeconds: 7200,
        projectId: project.id,
      });

      const result = await getProjectDistribution(db);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const projectDist = result.find((d) => d.name === "Project A");
      expect(projectDist).toBeDefined();
      expect(projectDist!.hours).toBe(2);
      expect(projectDist!.color).toBe("#ff0000");
    });

    it("should handle entries without a project", async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        stopTime: localISO(end),
        durationSeconds: 3600,
      });

      const result = await getProjectDistribution(db);
      expect(result.length).toBeGreaterThanOrEqual(1);

      const noProject = result.find((d) => d.name === "No Project");
      expect(noProject).toBeDefined();
      expect(noProject!.hours).toBe(1);
    });
  });

  describe("getRecentEntries", () => {
    it("should return empty array when no entries", async () => {
      const result = await getRecentEntries(db, 5);
      expect(result).toHaveLength(0);
    });

    it("should return completed entries sorted by start time desc", async () => {
      const now = new Date();

      // Earlier entry
      const start1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const end1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
      await createTimeEntry(db, {
        startTime: localISO(start1),
        stopTime: localISO(end1),
        durationSeconds: 3600,
        description: "First",
      });

      // Later entry
      const start2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
      const end2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
      await createTimeEntry(db, {
        startTime: localISO(start2),
        stopTime: localISO(end2),
        durationSeconds: 3600,
        description: "Second",
      });

      const result = await getRecentEntries(db, 5);
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe("Second");
      expect(result[1].description).toBe("First");
    });

    it("should respect the limit parameter", async () => {
      const now = new Date();

      for (let i = 0; i < 10; i++) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 30, 0);
        await createTimeEntry(db, {
          startTime: localISO(start),
          stopTime: localISO(end),
          durationSeconds: 1800,
          description: `Entry ${i}`,
        });
      }

      const result = await getRecentEntries(db, 3);
      expect(result).toHaveLength(3);
    });

    it("should not include running entries", async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        description: "Running",
      });

      const result = await getRecentEntries(db, 5);
      expect(result).toHaveLength(0);
    });

    it("should include project name and color", async () => {
      const project = await createProject(db, {
        name: "TestProject",
        color: "#00ff00",
      });

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        stopTime: localISO(end),
        durationSeconds: 3600,
        projectId: project.id,
        description: "With project",
      });

      const result = await getRecentEntries(db, 5);
      expect(result[0].projectName).toBe("TestProject");
      expect(result[0].projectColor).toBe("#00ff00");
    });
  });

  describe("getMostTrackedProject", () => {
    it("should return null when no entries exist", async () => {
      const result = await getMostTrackedProject(db);
      expect(result).toBeNull();
    });

    it("should return null when entries have no project", async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      await createTimeEntry(db, {
        startTime: localISO(start),
        stopTime: localISO(end),
        durationSeconds: 3600,
      });

      const result = await getMostTrackedProject(db);
      expect(result).toBeNull();
    });

    it("should return the project with the most tracked time", async () => {
      const projectA = await createProject(db, {
        name: "Project A",
        color: "#ff0000",
      });
      const projectB = await createProject(db, {
        name: "Project B",
        color: "#00ff00",
      });

      const now = new Date();

      // Project A: 1 hour
      await createTimeEntry(db, {
        startTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)),
        stopTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)),
        durationSeconds: 3600,
        projectId: projectA.id,
      });

      // Project B: 3 hours
      await createTimeEntry(db, {
        startTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)),
        stopTime: localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0)),
        durationSeconds: 10800,
        projectId: projectB.id,
      });

      const result = await getMostTrackedProject(db);
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Project B");
      expect(result!.hours).toBe(3);
      expect(result!.color).toBe("#00ff00");
    });
  });
});
