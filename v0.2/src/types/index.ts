import type {
  Client,
  NewClient,
  Project,
  NewProject,
  Tag,
  NewTag,
  TimeEntry,
  NewTimeEntry,
  TimeEntryTag,
  NewTimeEntryTag,
  Setting,
  NewSetting,
} from "@/db/schema";

// Re-export all entity types for convenience
export type {
  Client,
  NewClient,
  Project,
  NewProject,
  Tag,
  NewTag,
  TimeEntry,
  NewTimeEntry,
  TimeEntryTag,
  NewTimeEntryTag,
  Setting,
  NewSetting,
};

/** A time entry enriched with related project and tag data. */
export interface EnrichedTimeEntry extends TimeEntry {
  project?: Project | null;
  tags: Tag[];
}

/** Summary data for a project/client grouping. */
export interface GroupSummary {
  name: string;
  color?: string;
  entriesCount: number;
  totalSeconds: number;
  totalHours: number;
  billableAmount: number;
}

/** Daily hours data point (for charts). */
export interface DailyHours {
  date: string;
  hours: number;
}

/** Project distribution data (for donut chart). */
export interface ProjectDistribution {
  name: string;
  hours: number;
  color: string;
}

/** Date range type used for filtering. */
export interface DateRange {
  start: string;
  end: string;
}

/** Preset date range options. */
export type DatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

/** Report filter options. */
export interface ReportFilters {
  projectIds?: number[];
  clientIds?: number[];
  tagIds?: number[];
  billableOnly?: boolean;
}
