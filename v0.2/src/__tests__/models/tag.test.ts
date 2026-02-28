import { createTestDb } from "../helpers/testDb";
import {
  createTag,
  getAllTags,
  getTagById,
  updateTag,
  deleteTag,
  getUsageCount,
} from "@/models/tag";
import { createTimeEntry, addTags } from "@/models/timeEntry";

describe("Tag model", () => {
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

  describe("createTag", () => {
    it("should create a tag with unique name", async () => {
      const tag = await createTag(db, { name: "urgent" });
      expect(tag).toBeDefined();
      expect(tag.id).toBe(1);
      expect(tag.name).toBe("urgent");
    });

    it("should fail on duplicate tag name", async () => {
      await createTag(db, { name: "urgent" });
      await expect(createTag(db, { name: "urgent" })).rejects.toThrow();
    });
  });

  describe("getAllTags", () => {
    it("should return all tags", async () => {
      await createTag(db, { name: "tag1" });
      await createTag(db, { name: "tag2" });
      await createTag(db, { name: "tag3" });

      const tags = await getAllTags(db);
      expect(tags).toHaveLength(3);
    });

    it("should return empty array when no tags exist", async () => {
      const tags = await getAllTags(db);
      expect(tags).toHaveLength(0);
    });
  });

  describe("getTagById", () => {
    it("should return a tag by ID", async () => {
      await createTag(db, { name: "test" });
      const tag = await getTagById(db, 1);
      expect(tag).toBeDefined();
      expect(tag!.name).toBe("test");
    });

    it("should return undefined for non-existent ID", async () => {
      const tag = await getTagById(db, 999);
      expect(tag).toBeUndefined();
    });
  });

  describe("updateTag", () => {
    it("should update tag name", async () => {
      await createTag(db, { name: "old" });
      const updated = await updateTag(db, 1, { name: "new" });
      expect(updated!.name).toBe("new");
    });
  });

  describe("deleteTag", () => {
    it("should delete a tag", async () => {
      await createTag(db, { name: "to-delete" });
      const result = await deleteTag(db, 1);
      expect(result).toBe(true);

      const tag = await getTagById(db, 1);
      expect(tag).toBeUndefined();
    });

    it("should cascade delete from time_entry_tags", async () => {
      const tag = await createTag(db, { name: "cascading" });
      const entry = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      await addTags(db, entry.id, [tag.id]);

      // Verify tag is associated
      const usageBefore = await getUsageCount(db, tag.id);
      expect(usageBefore).toBe(1);

      // Delete the tag — should cascade
      await deleteTag(db, tag.id);

      // Junction row should be gone
      const usageAfter = await getUsageCount(db, tag.id);
      expect(usageAfter).toBe(0);
    });

    it("should return false for non-existent tag", async () => {
      const result = await deleteTag(db, 999);
      expect(result).toBe(false);
    });
  });

  describe("getUsageCount", () => {
    it("should return 0 when tag is unused", async () => {
      await createTag(db, { name: "unused" });
      const count = await getUsageCount(db, 1);
      expect(count).toBe(0);
    });

    it("should return correct usage count", async () => {
      const tag = await createTag(db, { name: "used" });
      const entry1 = await createTimeEntry(db, {
        startTime: "2024-01-01T09:00:00",
      });
      const entry2 = await createTimeEntry(db, {
        startTime: "2024-01-01T10:00:00",
      });
      await addTags(db, entry1.id, [tag.id]);
      await addTags(db, entry2.id, [tag.id]);

      const count = await getUsageCount(db, tag.id);
      expect(count).toBe(2);
    });
  });
});
