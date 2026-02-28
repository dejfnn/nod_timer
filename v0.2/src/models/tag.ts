import { eq, sql } from "drizzle-orm";
import { tags, timeEntryTags, type Tag, type NewTag } from "@/db/schema";
import type { DrizzleDB } from "@/db/client";

/** Create a new tag (name must be unique). */
export async function createTag(
  db: DrizzleDB,
  data: Pick<NewTag, "name">
): Promise<Tag> {
  const rows = await db.insert(tags).values({ name: data.name }).returning();
  return rows[0];
}

/** Get all tags. */
export async function getAllTags(db: DrizzleDB): Promise<Tag[]> {
  return db.select().from(tags);
}

/** Get a tag by ID. */
export async function getTagById(
  db: DrizzleDB,
  id: number
): Promise<Tag | undefined> {
  const rows = await db.select().from(tags).where(eq(tags.id, id));
  return rows[0];
}

/** Update a tag by ID. */
export async function updateTag(
  db: DrizzleDB,
  id: number,
  data: Partial<Pick<NewTag, "name">>
): Promise<Tag | undefined> {
  const rows = await db
    .update(tags)
    .set(data)
    .where(eq(tags.id, id))
    .returning();
  return rows[0];
}

/** Delete a tag by ID (cascades to time_entry_tags). */
export async function deleteTag(
  db: DrizzleDB,
  id: number
): Promise<boolean> {
  const rows = await db.delete(tags).where(eq(tags.id, id)).returning();
  return rows.length > 0;
}

/** Get the number of time entries using a tag. */
export async function getUsageCount(
  db: DrizzleDB,
  tagId: number
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(timeEntryTags)
    .where(eq(timeEntryTags.tagId, tagId));
  return rows[0]?.count ?? 0;
}
