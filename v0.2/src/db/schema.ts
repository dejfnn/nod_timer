import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// --- Clients ---
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  archived: integer("archived").default(0).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at"),
});

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

// --- Projects ---
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").default("#4A90D9").notNull(),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  billable: integer("billable").default(0).notNull(),
  hourlyRate: real("hourly_rate").default(0).notNull(),
  archived: integer("archived").default(0).notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at"),
});

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

// --- Tags ---
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Tag = InferSelectModel<typeof tags>;
export type NewTag = InferInsertModel<typeof tags>;

// --- Time Entries ---
export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    description: text("description").default("").notNull(),
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    startTime: text("start_time").notNull(),
    stopTime: text("stop_time"),
    durationSeconds: integer("duration_seconds"),
    billable: integer("billable").default(0).notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at"),
  },
  (table) => [
    index("idx_time_entries_start_time").on(table.startTime),
    index("idx_time_entries_project_id").on(table.projectId),
  ]
);

export type TimeEntry = InferSelectModel<typeof timeEntries>;
export type NewTimeEntry = InferInsertModel<typeof timeEntries>;

// --- Time Entry Tags (junction table) ---
export const timeEntryTags = sqliteTable(
  "time_entry_tags",
  {
    timeEntryId: integer("time_entry_id")
      .notNull()
      .references(() => timeEntries.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.timeEntryId, table.tagId] })]
);

export type TimeEntryTag = InferSelectModel<typeof timeEntryTags>;
export type NewTimeEntryTag = InferInsertModel<typeof timeEntryTags>;

// --- Settings (key-value) ---
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;
