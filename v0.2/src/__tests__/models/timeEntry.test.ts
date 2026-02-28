import { createTestDb } from "../helpers/testDb";
import {
  createTimeEntry,
  getAllTimeEntries,
  getTimeEntryById,
  updateTimeEntry,
  deleteTimeEntry,
  getActiveEntry,
  stopEntry,
  addTags,
  removeTags,
  getTagsForEntry,
} from "@/models/timeEntry";
import { createProject } from "@/models/project";
import { createTag } from "@/models/tag";

describe("TimeEntry model", () => {
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

  describe("createTimeEntry", () => {
    it("should create a basic time entry", async () => {
      const entry = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      expect(entry).toBeDefined();
      expect(entry.id).toBe(1);
      expect(entry.startTime).toBe("2024-01-01T09:00:00");
      expect(entry.stopTime).toBeNull();
      expect(entry.durationSeconds).toBeNull();
      expect(entry.description).toBe("");
    });

    it("should create a completed time entry with all fields", async () => {
      await createProject(db, { name: "Project" });
      const entry = await createTimeEntry(db, {
        description: "Working on feature",
        projectId: 1,
        startTime: "2024-01-01T09:00:00",
        stopTime: "2024-01-01T10:00:00",
        durationSeconds: 3600,
        billable: 1,
      });
      expect(entry.description).toBe("Working on feature");
      expect(entry.projectId).toBe(1);
      expect(entry.stopTime).toBe("2024-01-01T10:00:00");
      expect(entry.durationSeconds).toBe(3600);
      expect(entry.billable).toBe(1);
    });
  });

  describe("getAllTimeEntries", () => {
    it("should return all time entries", async () => {
      await createTimeEntry(db, { startTime: "2024-01-01T09:00:00" });
      await createTimeEntry(db, { startTime: "2024-01-01T10:00:00" });

      const entries = await getAllTimeEntries(db);
      expect(entries).toHaveLength(2);
    });
  });

  describe("getTimeEntryById", () => {
    it("should return entry by ID", async () => {
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
        description: "Test",
      });
      const entry = await getTimeEntryById(db, 1);
      expect(entry).toBeDefined();
      expect(entry!.description).toBe("Test");
    });

    it("should return undefined for non-existent ID", async () => {
      const entry = await getTimeEntryById(db, 999);
      expect(entry).toBeUndefined();
    });
  });

  describe("updateTimeEntry", () => {
    it("should update time entry fields", async () => {
      await createTimeEntry(db, { startTime: "2024-01-01T09:00:00" });
      const updated = await updateTimeEntry(db, 1, {
        description: "Updated description",
        billable: 1,
      });
      expect(updated!.description).toBe("Updated description");
      expect(updated!.billable).toBe(1);
      expect(updated!.updatedAt).toBeDefined();
    });
  });

  describe("deleteTimeEntry", () => {
    it("should delete a time entry", async () => {
      await createTimeEntry(db, { startTime: "2024-01-01T09:00:00" });
      const result = await deleteTimeEntry(db, 1);
      expect(result).toBe(true);

      const entry = await getTimeEntryById(db, 1);
      expect(entry).toBeUndefined();
    });

    it("should return false for non-existent entry", async () => {
      const result = await deleteTimeEntry(db, 999);
      expect(result).toBe(false);
    });
  });

  describe("getActiveEntry", () => {
    it("should return the running entry (stopTime IS NULL)", async () => {
      // Completed entry
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
        stopTime: "2024-01-01T10:00:00",
        durationSeconds: 3600,
      });
      // Active entry
      await createTimeEntry(db, {
        startTime: "2024-01-01T11:00:00",
        description: "Currently working",
      });

      const active = await getActiveEntry(db);
      expect(active).toBeDefined();
      expect(active!.description).toBe("Currently working");
      expect(active!.stopTime).toBeNull();
    });

    it("should return undefined when no active entry exists", async () => {
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
        stopTime: "2024-01-01T10:00:00",
        durationSeconds: 3600,
      });

      const active = await getActiveEntry(db);
      expect(active).toBeUndefined();
    });
  });

  describe("stopEntry", () => {
    it("should stop a running entry and calculate duration", async () => {
      await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });

      const stopped = await stopEntry(db, 1, "2024-01-01T10:00:00");
      expect(stopped).toBeDefined();
      expect(stopped!.stopTime).toBe("2024-01-01T10:00:00");
      expect(stopped!.durationSeconds).toBe(3600);
    });

    it("should return undefined for non-existent entry", async () => {
      const result = await stopEntry(db, 999, "2024-01-01T10:00:00");
      expect(result).toBeUndefined();
    });
  });

  describe("tag management", () => {
    it("should add tags to an entry", async () => {
      const entry = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      const tag1 = await createTag(db, { name: "urgent" });
      const tag2 = await createTag(db, { name: "bugfix" });

      await addTags(db, entry.id, [tag1.id, tag2.id]);

      const entryTags = await getTagsForEntry(db, entry.id);
      expect(entryTags).toHaveLength(2);
      expect(entryTags.map((t) => t.name).sort()).toEqual(["bugfix", "urgent"]);
    });

    it("should handle empty tag array gracefully", async () => {
      const entry = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      await addTags(db, entry.id, []);

      const entryTags = await getTagsForEntry(db, entry.id);
      expect(entryTags).toHaveLength(0);
    });

    it("should remove specific tags from an entry", async () => {
      const entry = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      const tag1 = await createTag(db, { name: "urgent" });
      const tag2 = await createTag(db, { name: "bugfix" });

      await addTags(db, entry.id, [tag1.id, tag2.id]);
      await removeTags(db, entry.id, [tag1.id]);

      const entryTags = await getTagsForEntry(db, entry.id);
      expect(entryTags).toHaveLength(1);
      expect(entryTags[0].name).toBe("bugfix");
    });

    it("should return tags for a specific entry", async () => {
      const entry1 = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      const entry2 = await createTimeEntry(db, {
        startTime: "2024-01-01T10:00:00",
      });
      const tag1 = await createTag(db, { name: "tag1" });
      const tag2 = await createTag(db, { name: "tag2" });

      await addTags(db, entry1.id, [tag1.id]);
      await addTags(db, entry2.id, [tag2.id]);

      const tags1 = await getTagsForEntry(db, entry1.id);
      expect(tags1).toHaveLength(1);
      expect(tags1[0].name).toBe("tag1");

      const tags2 = await getTagsForEntry(db, entry2.id);
      expect(tags2).toHaveLength(1);
      expect(tags2[0].name).toBe("tag2");
    });
  });
});
