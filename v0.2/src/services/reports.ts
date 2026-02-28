import {
  sql,
  eq,
  and,
  gte,
  lte,
  isNotNull,
  inArray,
  desc,
  asc,
} from "drizzle-orm";
import {
  timeEntries,
  projects,
  clients,
  tags,
  timeEntryTags,
} from "@/db/schema";
import type { DrizzleDB } from "@/db/client";
import type { ReportFilters, GroupSummary } from "@/types";
import { formatDate } from "@/utils/time";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry with enriched project/client/tag info for the detailed report. */
export interface DetailedEntry {
  id: number;
  description: string;
  startTime: string;
  stopTime: string;
  durationSeconds: number;
  billable: number;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  clientId: number | null;
  clientName: string | null;
  hourlyRate: number;
  billableAmount: number;
  tags: Array<{ id: number; name: string }>;
}

/** Weekly report row: project with hours per day-of-week. */
export interface WeeklyReportRow {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  /** hours per day index: 0=Mon … 6=Sun */
  days: [number, number, number, number, number, number, number];
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate billable amount for a single entry.
 */
export function calculateBillableAmount(
  durationSeconds: number,
  hourlyRate: number,
  isBillable: boolean | number,
): number {
  if (!isBillable) return 0;
  const hours = durationSeconds / 3600;
  return Math.round(hours * hourlyRate * 100) / 100;
}

/**
 * Build an array of Drizzle `and` conditions shared by every report query.
 * Handles the date range + optional filters for project, client, tag, billable.
 */
function buildWhereConditions(
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
) {
  const conds: ReturnType<typeof eq>[] = [
    gte(timeEntries.startTime, startDate),
    lte(timeEntries.startTime, endDate),
    isNotNull(timeEntries.stopTime),
  ];

  if (filters?.projectIds && filters.projectIds.length > 0) {
    conds.push(inArray(timeEntries.projectId, filters.projectIds));
  }

  if (filters?.clientIds && filters.clientIds.length > 0) {
    conds.push(inArray(projects.clientId, filters.clientIds));
  }

  if (filters?.billableOnly) {
    conds.push(eq(timeEntries.billable, 1));
  }

  return conds;
}

// ---------------------------------------------------------------------------
// Core queries
// ---------------------------------------------------------------------------

/**
 * Get all completed entries in range, optionally filtered.
 * When tag filter is active, entries are post-filtered.
 */
export async function getEntriesInRange(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
) {
  const conds = buildWhereConditions(startDate, endDate, filters);

  // We need the join to projects for client filtering
  const needsClientJoin =
    (filters?.clientIds && filters.clientIds.length > 0) || false;

  let rows;
  if (needsClientJoin) {
    rows = await db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        stopTime: timeEntries.stopTime,
        durationSeconds: timeEntries.durationSeconds,
        billable: timeEntries.billable,
        projectId: timeEntries.projectId,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(...conds))
      .orderBy(asc(timeEntries.startTime));
  } else {
    rows = await db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        stopTime: timeEntries.stopTime,
        durationSeconds: timeEntries.durationSeconds,
        billable: timeEntries.billable,
        projectId: timeEntries.projectId,
      })
      .from(timeEntries)
      .where(and(...conds))
      .orderBy(asc(timeEntries.startTime));
  }

  // Post-filter by tags if needed (single batch query instead of N+1)
  if (filters?.tagIds && filters.tagIds.length > 0) {
    const entryIds = rows.map((r) => r.id);
    if (entryIds.length === 0) return [];
    const matchingRows = await db
      .selectDistinct({ timeEntryId: timeEntryTags.timeEntryId })
      .from(timeEntryTags)
      .where(
        and(
          inArray(timeEntryTags.timeEntryId, entryIds),
          inArray(timeEntryTags.tagId, filters.tagIds),
        ),
      );
    const matchingIds = new Set(matchingRows.map((r) => r.timeEntryId));
    return rows.filter((r) => matchingIds.has(r.id));
  }

  return rows;
}

/**
 * Summary grouped by project: entries_count, total_seconds, total_hours, billable_amount.
 */
export async function summaryByProject(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
): Promise<GroupSummary[]> {
  const entries = await getEntriesInRange(db, startDate, endDate, filters);

  // Load project info in a single query
  const projectIds = [
    ...new Set(entries.map((e) => e.projectId).filter(Boolean)),
  ] as number[];
  const projectMap = new Map<
    number,
    { name: string; color: string; hourlyRate: number; billable: number }
  >();

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        hourlyRate: projects.hourlyRate,
        billable: projects.billable,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    for (const p of projectRows) {
      projectMap.set(p.id, {
        name: p.name,
        color: p.color,
        hourlyRate: p.hourlyRate,
        billable: p.billable,
      });
    }
  }

  // Group entries by project
  const groups = new Map<
    number | null,
    { count: number; seconds: number; billableAmount: number }
  >();

  for (const entry of entries) {
    const key = entry.projectId;
    const g = groups.get(key) ?? { count: 0, seconds: 0, billableAmount: 0 };
    g.count++;
    g.seconds += entry.durationSeconds ?? 0;
    const proj = key != null ? projectMap.get(key) : undefined;
    g.billableAmount += calculateBillableAmount(
      entry.durationSeconds ?? 0,
      proj?.hourlyRate ?? 0,
      entry.billable,
    );
    groups.set(key, g);
  }

  const result: GroupSummary[] = [];
  for (const [key, g] of groups) {
    const proj = key != null ? projectMap.get(key) : undefined;
    result.push({
      name: proj?.name ?? "No Project",
      color: proj?.color ?? "#4A90D9",
      entriesCount: g.count,
      totalSeconds: g.seconds,
      totalHours: Math.round((g.seconds / 3600) * 100) / 100,
      billableAmount: g.billableAmount,
    });
  }

  // Sort by total seconds descending
  result.sort((a, b) => b.totalSeconds - a.totalSeconds);
  return result;
}

/**
 * Summary grouped by client.
 */
export async function summaryByClient(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
): Promise<GroupSummary[]> {
  const entries = await getEntriesInRange(db, startDate, endDate, filters);

  // Load project → client mapping
  const projectIds = [
    ...new Set(entries.map((e) => e.projectId).filter(Boolean)),
  ] as number[];
  const projectMap = new Map<
    number,
    {
      clientId: number | null;
      hourlyRate: number;
      billable: number;
    }
  >();
  const clientMap = new Map<number, string>();

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id: projects.id,
        clientId: projects.clientId,
        hourlyRate: projects.hourlyRate,
        billable: projects.billable,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    for (const p of projectRows) {
      projectMap.set(p.id, {
        clientId: p.clientId,
        hourlyRate: p.hourlyRate,
        billable: p.billable,
      });
    }

    const clientIds = [
      ...new Set(projectRows.map((p) => p.clientId).filter(Boolean)),
    ] as number[];
    if (clientIds.length > 0) {
      const clientRows = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(inArray(clients.id, clientIds));
      for (const c of clientRows) {
        clientMap.set(c.id, c.name);
      }
    }
  }

  // Group by client
  const groups = new Map<
    number | null,
    { count: number; seconds: number; billableAmount: number }
  >();

  for (const entry of entries) {
    const proj =
      entry.projectId != null ? projectMap.get(entry.projectId) : undefined;
    const clientId = proj?.clientId ?? null;

    const g = groups.get(clientId) ?? {
      count: 0,
      seconds: 0,
      billableAmount: 0,
    };
    g.count++;
    g.seconds += entry.durationSeconds ?? 0;
    g.billableAmount += calculateBillableAmount(
      entry.durationSeconds ?? 0,
      proj?.hourlyRate ?? 0,
      entry.billable,
    );
    groups.set(clientId, g);
  }

  const result: GroupSummary[] = [];
  for (const [key, g] of groups) {
    result.push({
      name: key != null ? (clientMap.get(key) ?? "Unknown Client") : "No Client",
      entriesCount: g.count,
      totalSeconds: g.seconds,
      totalHours: Math.round((g.seconds / 3600) * 100) / 100,
      billableAmount: g.billableAmount,
    });
  }

  result.sort((a, b) => b.totalSeconds - a.totalSeconds);
  return result;
}

/**
 * Summary grouped by day.
 */
export async function summaryByDay(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
): Promise<GroupSummary[]> {
  const entries = await getEntriesInRange(db, startDate, endDate, filters);

  // Load project info for billable calculation
  const projectIds = [
    ...new Set(entries.map((e) => e.projectId).filter(Boolean)),
  ] as number[];
  const projectMap = new Map<
    number,
    { hourlyRate: number; billable: number }
  >();

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id: projects.id,
        hourlyRate: projects.hourlyRate,
        billable: projects.billable,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    for (const p of projectRows) {
      projectMap.set(p.id, {
        hourlyRate: p.hourlyRate,
        billable: p.billable,
      });
    }
  }

  // Group by date
  const groups = new Map<
    string,
    { count: number; seconds: number; billableAmount: number }
  >();

  for (const entry of entries) {
    const date = formatDate(entry.startTime);
    const g = groups.get(date) ?? { count: 0, seconds: 0, billableAmount: 0 };
    g.count++;
    g.seconds += entry.durationSeconds ?? 0;
    const proj =
      entry.projectId != null ? projectMap.get(entry.projectId) : undefined;
    g.billableAmount += calculateBillableAmount(
      entry.durationSeconds ?? 0,
      proj?.hourlyRate ?? 0,
      entry.billable,
    );
    groups.set(date, g);
  }

  const result: GroupSummary[] = [];
  for (const [date, g] of groups) {
    result.push({
      name: date,
      entriesCount: g.count,
      totalSeconds: g.seconds,
      totalHours: Math.round((g.seconds / 3600) * 100) / 100,
      billableAmount: g.billableAmount,
    });
  }

  // Sort by date ascending
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

/**
 * Detailed report: all entries enriched with project/client/tag info.
 */
export async function detailedReport(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
): Promise<DetailedEntry[]> {
  const entries = await getEntriesInRange(db, startDate, endDate, filters);

  // Load project info
  const projectIds = [
    ...new Set(entries.map((e) => e.projectId).filter(Boolean)),
  ] as number[];
  const projectMap = new Map<
    number,
    {
      name: string;
      color: string;
      clientId: number | null;
      hourlyRate: number;
      billable: number;
    }
  >();

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        clientId: projects.clientId,
        hourlyRate: projects.hourlyRate,
        billable: projects.billable,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    for (const p of projectRows) {
      projectMap.set(p.id, {
        name: p.name,
        color: p.color,
        clientId: p.clientId,
        hourlyRate: p.hourlyRate,
        billable: p.billable,
      });
    }
  }

  // Load client names
  const clientIds = [
    ...new Set(
      [...projectMap.values()].map((p) => p.clientId).filter(Boolean),
    ),
  ] as number[];
  const clientMap = new Map<number, string>();
  if (clientIds.length > 0) {
    const clientRows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(inArray(clients.id, clientIds));
    for (const c of clientRows) {
      clientMap.set(c.id, c.name);
    }
  }

  // Load tags for all entries
  const entryIds = entries.map((e) => e.id);
  const tagMap = new Map<number, Array<{ id: number; name: string }>>();

  if (entryIds.length > 0) {
    const tagRows = await db
      .select({
        timeEntryId: timeEntryTags.timeEntryId,
        tagId: tags.id,
        tagName: tags.name,
      })
      .from(timeEntryTags)
      .innerJoin(tags, eq(timeEntryTags.tagId, tags.id))
      .where(inArray(timeEntryTags.timeEntryId, entryIds));

    for (const row of tagRows) {
      const arr = tagMap.get(row.timeEntryId) ?? [];
      arr.push({ id: row.tagId, name: row.tagName });
      tagMap.set(row.timeEntryId, arr);
    }
  }

  // Build detailed entries
  return entries.map((entry) => {
    const proj =
      entry.projectId != null ? projectMap.get(entry.projectId) : undefined;
    const clientId = proj?.clientId ?? null;
    const duration = entry.durationSeconds ?? 0;
    const hourlyRate = proj?.hourlyRate ?? 0;

    return {
      id: entry.id,
      description: entry.description,
      startTime: entry.startTime,
      stopTime: entry.stopTime ?? "",
      durationSeconds: duration,
      billable: entry.billable,
      projectId: entry.projectId,
      projectName: proj?.name ?? null,
      projectColor: proj?.color ?? null,
      clientId,
      clientName: clientId != null ? (clientMap.get(clientId) ?? null) : null,
      hourlyRate,
      billableAmount: calculateBillableAmount(duration, hourlyRate, entry.billable),
      tags: tagMap.get(entry.id) ?? [],
    };
  });
}

/**
 * Weekly report: project x day-of-week pivot with hours.
 */
export async function weeklyReport(
  db: DrizzleDB,
  startDate: string,
  endDate: string,
  filters?: ReportFilters,
): Promise<WeeklyReportRow[]> {
  const entries = await getEntriesInRange(db, startDate, endDate, filters);

  // Load project info
  const projectIds = [
    ...new Set(entries.map((e) => e.projectId).filter(Boolean)),
  ] as number[];
  const projectMap = new Map<
    number,
    { name: string; color: string }
  >();

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));
    for (const p of projectRows) {
      projectMap.set(p.id, { name: p.name, color: p.color });
    }
  }

  // Group by project x day-of-week
  const groups = new Map<number | null, [number, number, number, number, number, number, number]>();

  for (const entry of entries) {
    const key = entry.projectId;
    if (!groups.has(key)) {
      groups.set(key, [0, 0, 0, 0, 0, 0, 0]);
    }
    const days = groups.get(key)!;
    const date = new Date(entry.startTime);
    // Convert JS day (0=Sun) to ISO day (0=Mon)
    const jsDay = date.getDay();
    const isoDay = jsDay === 0 ? 6 : jsDay - 1;
    days[isoDay] += (entry.durationSeconds ?? 0) / 3600;
  }

  const result: WeeklyReportRow[] = [];
  for (const [key, days] of groups) {
    const proj = key != null ? projectMap.get(key) : undefined;
    const rounded = days.map((d) => Math.round(d * 100) / 100) as WeeklyReportRow["days"];
    result.push({
      projectId: key,
      projectName: proj?.name ?? "No Project",
      projectColor: proj?.color ?? "#4A90D9",
      days: rounded,
      total: Math.round(rounded.reduce((a, b) => a + b, 0) * 100) / 100,
    });
  }

  result.sort((a, b) => b.total - a.total);
  return result;
}
