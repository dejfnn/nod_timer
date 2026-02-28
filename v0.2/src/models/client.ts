import { eq, and, sql } from "drizzle-orm";
import { clients, projects, type Client, type NewClient } from "@/db/schema";
import type { DrizzleDB } from "@/db/client";
import { nowISO } from "@/utils/time";

/** Create a new client. */
export async function createClient(
  db: DrizzleDB,
  data: Pick<NewClient, "name">
): Promise<Client> {
  const rows = await db
    .insert(clients)
    .values({ name: data.name })
    .returning();
  return rows[0];
}

/** Get all clients, optionally including archived ones. */
export async function getAllClients(
  db: DrizzleDB,
  includeArchived = false
): Promise<Client[]> {
  if (includeArchived) {
    return db.select().from(clients);
  }
  return db.select().from(clients).where(eq(clients.archived, 0));
}

/** Get a client by ID. */
export async function getClientById(
  db: DrizzleDB,
  id: number
): Promise<Client | undefined> {
  const rows = await db.select().from(clients).where(eq(clients.id, id));
  return rows[0];
}

/** Update a client by ID. */
export async function updateClient(
  db: DrizzleDB,
  id: number,
  data: Partial<Pick<NewClient, "name" | "archived">>
): Promise<Client | undefined> {
  const rows = await db
    .update(clients)
    .set({ ...data, updatedAt: nowISO() })
    .where(eq(clients.id, id))
    .returning();
  return rows[0];
}

/** Delete a client by ID. */
export async function deleteClient(
  db: DrizzleDB,
  id: number
): Promise<boolean> {
  const rows = await db.delete(clients).where(eq(clients.id, id)).returning();
  return rows.length > 0;
}

/** Get the count of projects belonging to a client. */
export async function getProjectCount(
  db: DrizzleDB,
  clientId: number
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(projects)
    .where(eq(projects.clientId, clientId));
  return rows[0]?.count ?? 0;
}

/** Check if a client has any active (non-archived) projects. */
export async function hasActiveProjects(
  db: DrizzleDB,
  clientId: number
): Promise<boolean> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(projects)
    .where(and(eq(projects.clientId, clientId), eq(projects.archived, 0)));
  return (rows[0]?.count ?? 0) > 0;
}
