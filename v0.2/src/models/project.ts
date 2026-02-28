import { eq, sql } from "drizzle-orm";
import {
  projects,
  timeEntries,
  type Project,
  type NewProject,
} from "@/db/schema";
import type { DrizzleDB } from "@/db/client";
import { nowISO } from "@/utils/time";

/** Create a new project. */
export async function createProject(
  db: DrizzleDB,
  data: Pick<NewProject, "name"> &
    Partial<
      Pick<NewProject, "color" | "clientId" | "billable" | "hourlyRate">
    >
): Promise<Project> {
  const rows = await db
    .insert(projects)
    .values({
      name: data.name,
      color: data.color,
      clientId: data.clientId,
      billable: data.billable,
      hourlyRate: data.hourlyRate,
    })
    .returning();
  return rows[0];
}

/** Get all projects, optionally including archived ones. */
export async function getAllProjects(
  db: DrizzleDB,
  includeArchived = false
): Promise<Project[]> {
  if (includeArchived) {
    return db.select().from(projects);
  }
  return db.select().from(projects).where(eq(projects.archived, 0));
}

/** Get a project by ID. */
export async function getProjectById(
  db: DrizzleDB,
  id: number
): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id));
  return rows[0];
}

/** Update a project by ID. */
export async function updateProject(
  db: DrizzleDB,
  id: number,
  data: Partial<
    Pick<
      NewProject,
      "name" | "color" | "clientId" | "billable" | "hourlyRate" | "archived"
    >
  >
): Promise<Project | undefined> {
  const rows = await db
    .update(projects)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0];
}

/** Delete a project by ID. */
export async function deleteProject(
  db: DrizzleDB,
  id: number
): Promise<boolean> {
  const rows = await db.delete(projects).where(eq(projects.id, id)).returning();
  return rows.length > 0;
}

/** Get total tracked time in seconds for a project. */
export async function getTotalTrackedTime(
  db: DrizzleDB,
  projectId: number
): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, projectId));
  return rows[0]?.total ?? 0;
}
