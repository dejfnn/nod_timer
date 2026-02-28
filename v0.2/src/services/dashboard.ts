import { sql, eq, and, gte, lte, isNotNull, desc } from "drizzle-orm";
import { timeEntries, projects } from "@/db/schema";
import type { DrizzleDB } from "@/db/client";
import type { DailyHours, ProjectDistribution } from "@/types";
import {
  getTodayRange,
  getWeekRange,
  getMonthRange,
  formatDate,
} from "@/utils/time";

/**
 * Sum of today's completed entry durations in seconds.
 */
export async function getTodayTotal(db: DrizzleDB): Promise<number> {
  const { start, end } = getTodayRange();
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        gte(timeEntries.startTime, start),
        lte(timeEntries.startTime, end),
        isNotNull(timeEntries.stopTime),
      ),
    );
  return rows[0]?.total ?? 0;
}

/**
 * Sum of current week (Mon-Sun) completed entry durations in seconds.
 */
export async function getWeekTotal(db: DrizzleDB): Promise<number> {
  const { start, end } = getWeekRange();
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        gte(timeEntries.startTime, start),
        lte(timeEntries.startTime, end),
        isNotNull(timeEntries.stopTime),
      ),
    );
  return rows[0]?.total ?? 0;
}

/**
 * Sum of current month completed entry durations in seconds.
 */
export async function getMonthTotal(db: DrizzleDB): Promise<number> {
  const { start, end } = getMonthRange();
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        gte(timeEntries.startTime, start),
        lte(timeEntries.startTime, end),
        isNotNull(timeEntries.stopTime),
      ),
    );
  return rows[0]?.total ?? 0;
}

/**
 * Daily hours for the last 7 days (for bar chart).
 * Returns an array sorted oldest-first with { date, hours }.
 */
export async function getLast7Days(
  db: DrizzleDB,
): Promise<DailyHours[]> {
  const result: DailyHours[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i,
    );
    const dayStart = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
    );
    const dayEnd = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      23,
      59,
      59,
    );

    const startStr = toLocalISO(dayStart);
    const endStr = toLocalISO(dayEnd);

    const rows = await db
      .select({
        total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
      })
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.startTime, startStr),
          lte(timeEntries.startTime, endStr),
          isNotNull(timeEntries.stopTime),
        ),
      );

    const totalSeconds = rows[0]?.total ?? 0;
    result.push({
      date: formatDate(startStr),
      hours: Math.round((totalSeconds / 3600) * 100) / 100,
    });
  }

  return result;
}

/**
 * Project distribution for donut chart.
 * Groups completed entries by project and returns hours + color.
 */
export async function getProjectDistribution(
  db: DrizzleDB,
): Promise<ProjectDistribution[]> {
  const rows = await db
    .select({
      projectId: timeEntries.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      total: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(isNotNull(timeEntries.stopTime))
    .groupBy(timeEntries.projectId);

  return rows
    .filter((r) => r.total > 0)
    .map((r) => ({
      name: r.projectName ?? "No Project",
      hours: Math.round((r.total / 3600) * 100) / 100,
      color: r.projectColor ?? "#4A90D9",
    }));
}

/**
 * Last N completed entries with project info.
 */
export async function getRecentEntries(
  db: DrizzleDB,
  limit: number = 5,
): Promise<
  Array<{
    id: number;
    description: string;
    durationSeconds: number;
    projectName: string | null;
    projectColor: string | null;
    startTime: string;
  }>
> {
  const rows = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      durationSeconds: timeEntries.durationSeconds,
      projectName: projects.name,
      projectColor: projects.color,
      startTime: timeEntries.startTime,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(isNotNull(timeEntries.stopTime))
    .orderBy(desc(timeEntries.startTime))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    durationSeconds: r.durationSeconds ?? 0,
    projectName: r.projectName,
    projectColor: r.projectColor,
    startTime: r.startTime,
  }));
}

/**
 * Project with the most tracked hours overall.
 * Returns null if no entries exist.
 */
export async function getMostTrackedProject(
  db: DrizzleDB,
): Promise<{ name: string; hours: number; color: string } | null> {
  const totalExpr = sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`;
  const rows = await db
    .select({
      projectName: projects.name,
      projectColor: projects.color,
      total: totalExpr,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(isNotNull(timeEntries.stopTime))
    .groupBy(timeEntries.projectId)
    .orderBy(desc(totalExpr))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    name: row.projectName,
    hours: Math.round((row.total / 3600) * 100) / 100,
    color: row.projectColor,
  };
}

/** Internal helper: convert Date to local ISO "YYYY-MM-DDTHH:MM:SS". */
function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}
