import { eq } from "drizzle-orm";
import {
  settings,
  clients,
  projects,
  tags,
  timeEntries,
  timeEntryTags,
} from "@/db/schema";
import type { DrizzleDB } from "@/db/client";

const DEFAULT_WORKING_HOURS = 8.0;

/** Get a setting value by key. Returns null if not found. */
export async function getSetting(
  db: DrizzleDB,
  key: string
): Promise<string | null> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

/** Set a setting value (upsert). */
export async function setSetting(
  db: DrizzleDB,
  key: string,
  value: string
): Promise<void> {
  // Try insert, on conflict update
  const existing = await getSetting(db, key);
  if (existing !== null) {
    await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

/** Get configured working hours per day (defaults to 8.0). */
export async function getWorkingHours(db: DrizzleDB): Promise<number> {
  const val = await getSetting(db, "working_hours");
  if (val === null) return DEFAULT_WORKING_HOURS;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? DEFAULT_WORKING_HOURS : parsed;
}

/**
 * Calculate capacity percent: (trackedSeconds / workingHoursInSeconds) * 100.
 * Capped at 100.
 */
export async function calculateCapacityPercent(
  db: DrizzleDB,
  trackedSeconds: number
): Promise<number> {
  const workingHours = await getWorkingHours(db);
  const capacitySeconds = workingHours * 3600;
  if (capacitySeconds === 0) return 0;
  const percent = (trackedSeconds / capacitySeconds) * 100;
  return Math.min(percent, 100);
}

/** Export all data as a JSON-serializable object. */
export async function exportAllData(
  db: DrizzleDB
): Promise<Record<string, unknown>> {
  const allClients = await db.select().from(clients);
  const allProjects = await db.select().from(projects);
  const allTags = await db.select().from(tags);
  const allTimeEntries = await db.select().from(timeEntries);
  const allTimeEntryTags = await db.select().from(timeEntryTags);
  const allSettings = await db.select().from(settings);

  return {
    clients: allClients,
    projects: allProjects,
    tags: allTags,
    timeEntries: allTimeEntries,
    timeEntryTags: allTimeEntryTags,
    settings: allSettings,
    exportedAt: new Date().toISOString(),
    version: "0.2.0",
  };
}

/** Import data from a JSON backup, replacing all existing data. */
export async function importAllData(
  db: DrizzleDB,
  data: Record<string, unknown>
): Promise<void> {
  // Delete all existing data (order matters for foreign keys)
  await db.delete(timeEntryTags);
  await db.delete(timeEntries);
  await db.delete(projects);
  await db.delete(clients);
  await db.delete(tags);
  await db.delete(settings);

  // Re-insert from backup
  const clientsData = data.clients as Array<Record<string, unknown>>;
  const projectsData = data.projects as Array<Record<string, unknown>>;
  const tagsData = data.tags as Array<Record<string, unknown>>;
  const timeEntriesData = data.timeEntries as Array<Record<string, unknown>>;
  const timeEntryTagsData = data.timeEntryTags as Array<
    Record<string, unknown>
  >;
  const settingsData = data.settings as Array<Record<string, unknown>>;

  if (clientsData?.length) {
    await db.insert(clients).values(clientsData as any);
  }
  if (projectsData?.length) {
    await db.insert(projects).values(projectsData as any);
  }
  if (tagsData?.length) {
    await db.insert(tags).values(tagsData as any);
  }
  if (timeEntriesData?.length) {
    await db.insert(timeEntries).values(timeEntriesData as any);
  }
  if (timeEntryTagsData?.length) {
    await db.insert(timeEntryTags).values(timeEntryTagsData as any);
  }
  if (settingsData?.length) {
    await db.insert(settings).values(settingsData as any);
  }
}
