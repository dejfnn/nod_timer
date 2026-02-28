import { createTestDb } from "../helpers/testDb";
import {
  getSetting,
  setSetting,
  getWorkingHours,
  calculateCapacityPercent,
  exportAllData,
  importAllData,
} from "@/models/settings";
import { createClient } from "@/models/client";
import { createProject } from "@/models/project";
import { createTag } from "@/models/tag";
import { createTimeEntry } from "@/models/timeEntry";

describe("Settings model", () => {
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

  describe("getSetting / setSetting", () => {
    it("should return null for non-existent key", async () => {
      const val = await getSetting(db, "nonexistent");
      expect(val).toBeNull();
    });

    it("should set and get a setting", async () => {
      await setSetting(db, "theme", "dark");
      const val = await getSetting(db, "theme");
      expect(val).toBe("dark");
    });

    it("should update an existing setting", async () => {
      await setSetting(db, "theme", "dark");
      await setSetting(db, "theme", "light");
      const val = await getSetting(db, "theme");
      expect(val).toBe("light");
    });
  });

  describe("getWorkingHours", () => {
    it("should return 8.0 as default", async () => {
      const hours = await getWorkingHours(db);
      expect(hours).toBe(8.0);
    });

    it("should return configured working hours", async () => {
      await setSetting(db, "working_hours", "6.5");
      const hours = await getWorkingHours(db);
      expect(hours).toBe(6.5);
    });

    it("should return default for invalid value", async () => {
      await setSetting(db, "working_hours", "not-a-number");
      const hours = await getWorkingHours(db);
      expect(hours).toBe(8.0);
    });
  });

  describe("calculateCapacityPercent", () => {
    it("should calculate correct percentage", async () => {
      // Default 8h = 28800s
      const percent = await calculateCapacityPercent(db, 14400); // 4 hours
      expect(percent).toBe(50);
    });

    it("should cap at 100%", async () => {
      const percent = await calculateCapacityPercent(db, 50000); // > 8h
      expect(percent).toBe(100);
    });

    it("should return 0 for 0 seconds tracked", async () => {
      const percent = await calculateCapacityPercent(db, 0);
      expect(percent).toBe(0);
    });

    it("should use configured working hours", async () => {
      await setSetting(db, "working_hours", "4");
      // 4h = 14400s, track 7200s = 2h = 50%
      const percent = await calculateCapacityPercent(db, 7200);
      expect(percent).toBe(50);
    });
  });

  describe("exportAllData", () => {
    it("should export all data as JSON object", async () => {
      await createClient(db, { name: "Client" });
      await createProject(db, { name: "Project" });
      await createTag(db, { name: "tag1" });
      await createTimeEntry(db, { startTime: "2024-01-01T09:00:00" });
      await setSetting(db, "theme", "dark");

      const data = await exportAllData(db);

      expect(data.clients).toHaveLength(1);
      expect(data.projects).toHaveLength(1);
      expect(data.tags).toHaveLength(1);
      expect(data.timeEntries).toHaveLength(1);
      expect(data.settings).toHaveLength(1);
      expect(data.exportedAt).toBeDefined();
      expect(data.version).toBe("0.2.0");
    });

    it("should export empty data when no records exist", async () => {
      const data = await exportAllData(db);
      expect(data.clients).toHaveLength(0);
      expect(data.projects).toHaveLength(0);
      expect(data.tags).toHaveLength(0);
      expect(data.timeEntries).toHaveLength(0);
      expect(data.settings).toHaveLength(0);
    });
  });

  describe("importAllData", () => {
    it("should import data and replace existing", async () => {
      // Create some existing data
      await createClient(db, { name: "Old Client" });

      // Import new data
      const backup = {
        clients: [
          {
            id: 1,
            name: "Imported Client",
            archived: 0,
            created_at: "2024-01-01T00:00:00",
            updated_at: null,
          },
        ],
        projects: [],
        tags: [],
        timeEntries: [],
        timeEntryTags: [],
        settings: [{ key: "theme", value: "imported" }],
      };

      await importAllData(db, backup);

      // Verify old data is replaced
      const { getAllClients } = await import("@/models/client");
      const clients = await getAllClients(db, true);
      expect(clients).toHaveLength(1);
      expect(clients[0].name).toBe("Imported Client");

      const theme = await getSetting(db, "theme");
      expect(theme).toBe("imported");
    });
  });
});
