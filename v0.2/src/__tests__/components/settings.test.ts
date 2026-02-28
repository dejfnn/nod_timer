/**
 * Tests for settings functionality — focuses on the data layer and business
 * logic that backs the Settings screen: default project, billable, timezone,
 * working hours persistence, and JSON export/import.
 *
 * We test through the model layer (getSetting/setSetting) since rendering
 * the full React Native screen requires a complete Expo environment.
 */

import { createTestDb } from "../helpers/testDb";

// Mock the DB client module to avoid expo-sqlite import
jest.mock("@/db/client", () => ({
  db: null,
  initDatabase: jest.fn(),
}));

import {
  getSetting,
  setSetting,
  getWorkingHours,
  calculateCapacityPercent,
  exportAllData,
  importAllData,
} from "@/models/settings";
import { createProject, getAllProjects } from "@/models/project";
import { createClient } from "@/models/client";
import { createTag, getAllTags } from "@/models/tag";
import { createTimeEntry, getAllTimeEntries } from "@/models/timeEntry";

describe("Settings screen data layer", () => {
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

  // -------------------------------------------------------------------------
  // Default project setting
  // -------------------------------------------------------------------------
  describe("default project setting", () => {
    it("should store and retrieve default project ID", async () => {
      await setSetting(db, "default_project_id", "42");
      const val = await getSetting(db, "default_project_id");
      expect(val).toBe("42");
    });

    it("should return null when no default project is set", async () => {
      const val = await getSetting(db, "default_project_id");
      expect(val).toBeNull();
    });

    it("should overwrite default project ID", async () => {
      await setSetting(db, "default_project_id", "1");
      await setSetting(db, "default_project_id", "2");
      const val = await getSetting(db, "default_project_id");
      expect(val).toBe("2");
    });

    it("should store empty string to clear default project", async () => {
      await setSetting(db, "default_project_id", "5");
      await setSetting(db, "default_project_id", "");
      const val = await getSetting(db, "default_project_id");
      expect(val).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Default billable setting
  // -------------------------------------------------------------------------
  describe("default billable setting", () => {
    it("should store billable as '1'", async () => {
      await setSetting(db, "default_billable", "1");
      const val = await getSetting(db, "default_billable");
      expect(val).toBe("1");
    });

    it("should store non-billable as '0'", async () => {
      await setSetting(db, "default_billable", "0");
      const val = await getSetting(db, "default_billable");
      expect(val).toBe("0");
    });
  });

  // -------------------------------------------------------------------------
  // Timezone setting
  // -------------------------------------------------------------------------
  describe("timezone setting", () => {
    it("should store and retrieve timezone", async () => {
      await setSetting(db, "timezone", "America/New_York");
      const val = await getSetting(db, "timezone");
      expect(val).toBe("America/New_York");
    });

    it("should update timezone", async () => {
      await setSetting(db, "timezone", "UTC");
      await setSetting(db, "timezone", "Europe/Prague");
      const val = await getSetting(db, "timezone");
      expect(val).toBe("Europe/Prague");
    });
  });

  // -------------------------------------------------------------------------
  // Working hours
  // -------------------------------------------------------------------------
  describe("working hours setting", () => {
    it("should default to 8.0 when not set", async () => {
      const hours = await getWorkingHours(db);
      expect(hours).toBe(8.0);
    });

    it("should save and retrieve custom working hours", async () => {
      await setSetting(db, "working_hours", "6.5");
      const hours = await getWorkingHours(db);
      expect(hours).toBe(6.5);
    });

    it("should handle minimum value of 0.5", async () => {
      await setSetting(db, "working_hours", "0.5");
      const hours = await getWorkingHours(db);
      expect(hours).toBe(0.5);
    });

    it("should handle maximum value of 24.0", async () => {
      await setSetting(db, "working_hours", "24.0");
      const hours = await getWorkingHours(db);
      expect(hours).toBe(24.0);
    });

    it("should affect capacity calculation", async () => {
      await setSetting(db, "working_hours", "10.0");

      // 5h out of 10h = 50%
      const percent = await calculateCapacityPercent(db, 5 * 3600);
      expect(percent).toBe(50);
    });

    it("should cap capacity at 100%", async () => {
      await setSetting(db, "working_hours", "8.0");

      // 10h out of 8h → capped at 100
      const percent = await calculateCapacityPercent(db, 10 * 3600);
      expect(percent).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Export / Import
  // -------------------------------------------------------------------------
  describe("JSON export", () => {
    it("should export empty database", async () => {
      const data = await exportAllData(db);

      expect(data.clients).toEqual([]);
      expect(data.projects).toEqual([]);
      expect(data.tags).toEqual([]);
      expect(data.timeEntries).toEqual([]);
      expect(data.timeEntryTags).toEqual([]);
      expect(data.settings).toEqual([]);
      expect(data.version).toBe("0.2.0");
      expect(data.exportedAt).toBeDefined();
    });

    it("should export all data", async () => {
      // Seed data
      await createClient(db, { name: "TestClient" });
      await createProject(db, { name: "TestProject" });
      await createTag(db, { name: "TestTag" });
      await createTimeEntry(db, {
        description: "Test entry",
        startTime: "2025-01-01T09:00:00",
      });
      await setSetting(db, "working_hours", "6.0");

      const data = await exportAllData(db);

      expect((data.clients as any[]).length).toBe(1);
      expect((data.projects as any[]).length).toBe(1);
      expect((data.tags as any[]).length).toBe(1);
      expect((data.timeEntries as any[]).length).toBe(1);
      expect((data.settings as any[]).length).toBe(1);
    });
  });

  describe("JSON import", () => {
    it("should import data and replace existing", async () => {
      // Create some initial data
      await createClient(db, { name: "OldClient" });

      // Import new data
      const backup = {
        clients: [
          { id: 1, name: "NewClient", archived: 0, createdAt: "2025-01-01T00:00:00" },
        ],
        projects: [],
        tags: [],
        timeEntries: [],
        timeEntryTags: [],
        settings: [{ key: "working_hours", value: "7.5" }],
        version: "0.2.0",
        exportedAt: "2025-01-01T00:00:00",
      };

      await importAllData(db, backup);

      // Old data should be gone
      const allClients = await db.select().from(require("@/db/schema").clients);
      expect(allClients).toHaveLength(1);
      expect(allClients[0].name).toBe("NewClient");

      // Settings should be imported
      const hours = await getWorkingHours(db);
      expect(hours).toBe(7.5);
    });

    it("should handle import with all entity types", async () => {
      const backup = {
        clients: [
          { id: 1, name: "Client1", archived: 0, createdAt: "2025-01-01T00:00:00" },
        ],
        projects: [
          {
            id: 1,
            name: "Project1",
            color: "#ff0000",
            clientId: 1,
            billable: 1,
            hourlyRate: 100,
            archived: 0,
            createdAt: "2025-01-01T00:00:00",
          },
        ],
        tags: [{ id: 1, name: "Tag1", createdAt: "2025-01-01T00:00:00" }],
        timeEntries: [
          {
            id: 1,
            description: "Entry1",
            projectId: 1,
            startTime: "2025-01-01T09:00:00",
            stopTime: "2025-01-01T10:00:00",
            durationSeconds: 3600,
            billable: 1,
            createdAt: "2025-01-01T00:00:00",
          },
        ],
        timeEntryTags: [{ timeEntryId: 1, tagId: 1 }],
        settings: [],
        version: "0.2.0",
      };

      await importAllData(db, backup);

      const projects = await getAllProjects(db, true);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Project1");

      const tags = await getAllTags(db);
      expect(tags).toHaveLength(1);

      const entries = await getAllTimeEntries(db);
      expect(entries).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple settings at once
  // -------------------------------------------------------------------------
  describe("multiple settings", () => {
    it("should persist multiple settings independently", async () => {
      await setSetting(db, "default_project_id", "3");
      await setSetting(db, "default_billable", "1");
      await setSetting(db, "timezone", "Europe/Prague");
      await setSetting(db, "working_hours", "7.0");

      expect(await getSetting(db, "default_project_id")).toBe("3");
      expect(await getSetting(db, "default_billable")).toBe("1");
      expect(await getSetting(db, "timezone")).toBe("Europe/Prague");
      expect(await getWorkingHours(db)).toBe(7.0);
    });
  });
});
