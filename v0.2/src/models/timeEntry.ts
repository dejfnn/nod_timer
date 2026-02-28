import { eq, isNull, and, sql } from "drizzle-orm";
import {
  timeEntries,
  timeEntryTags,
  tags,
  type TimeEntry,
  type NewTimeEntry,
  type Tag,
} from "@/db/schema";
import type { DrizzleDB } from "@/db/client";
import { nowISO, diffSeconds } from "@/utils/time";

/** Create a new time entry. */
export async function createTimeEntry(
  db: DrizzleDB,
  data: Pick<NewTimeEntry, "startTime"> &
    Partial<
      Pick<
        NewTimeEntry,
        "description" | "projectId" | "stopTime" | "durationSeconds" | "billable"
      >
    >
): Promise<TimeEntry> {
  const rows = await db
    .insert(timeEntries)
    .values({
      description: data.description ?? "",
      projectId: data.projectId,
      startTime: data.startTime,
      stopTime: data.stopTime,
      durationSeconds: data.durationSeconds,
      billable: data.billable,
    })
    .returning();
  return rows[0];
}

/** Get all time entries. */
export async function getAllTimeEntries(db: DrizzleDB): Promise<TimeEntry[]> {
  return db.select().from(timeEntries);
}

/** Get a time entry by ID. */
export async function getTimeEntryById(
  db: DrizzleDB,
  id: number
): Promise<TimeEntry | undefined> {
  const rows = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id));
  return rows[0];
}

/** Update a time entry by ID. */
export async function updateTimeEntry(
  db: DrizzleDB,
  id: number,
  data: Partial<
    Pick<
      NewTimeEntry,
      | "description"
      | "projectId"
      | "startTime"
      | "stopTime"
      | "durationSeconds"
      | "billable"
    >
  >
): Promise<TimeEntry | undefined> {
  const rows = await db
    .update(timeEntries)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(timeEntries.id, id))
    .returning();
  return rows[0];
}

/** Delete a time entry by ID. */
export async function deleteTimeEntry(
  db: DrizzleDB,
  id: number
): Promise<boolean> {
  const rows = await db
    .delete(timeEntries)
    .where(eq(timeEntries.id, id))
    .returning();
  return rows.length > 0;
}

/** Get the currently running (active) entry — where stopTime IS NULL. */
export async function getActiveEntry(
  db: DrizzleDB
): Promise<TimeEntry | undefined> {
  const rows = await db
    .select()
    .from(timeEntries)
    .where(isNull(timeEntries.stopTime));
  return rows[0];
}

/** Stop a running entry: set stopTime and calculate durationSeconds. */
export async function stopEntry(
  db: DrizzleDB,
  id: number,
  stopTime?: string
): Promise<TimeEntry | undefined> {
  const entry = await getTimeEntryById(db, id);
  if (!entry) return undefined;

  const stop = stopTime ?? nowISO();
  const duration = diffSeconds(entry.startTime, stop);

  const rows = await db
    .update(timeEntries)
    .set({
      stopTime: stop,
      durationSeconds: duration,
      updatedAt: nowISO(),
    })
    .where(eq(timeEntries.id, id))
    .returning();
  return rows[0];
}

/** Add tags to a time entry. */
export async function addTags(
  db: DrizzleDB,
  timeEntryId: number,
  tagIds: number[]
): Promise<void> {
  if (tagIds.length === 0) return;
  await db.insert(timeEntryTags).values(
    tagIds.map((tagId) => ({ timeEntryId, tagId }))
  );
}

/** Remove specific tags from a time entry. */
export async function removeTags(
  db: DrizzleDB,
  timeEntryId: number,
  tagIds: number[]
): Promise<void> {
  for (const tagId of tagIds) {
    await db
      .delete(timeEntryTags)
      .where(
        and(
          eq(timeEntryTags.timeEntryId, timeEntryId),
          eq(timeEntryTags.tagId, tagId)
        )
      );
  }
}

/** Get all tags associated with a time entry. */
export async function getTagsForEntry(
  db: DrizzleDB,
  timeEntryId: number
): Promise<Tag[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
    })
    .from(timeEntryTags)
    .innerJoin(tags, eq(timeEntryTags.tagId, tags.id))
    .where(eq(timeEntryTags.timeEntryId, timeEntryId));
  return rows;
}
