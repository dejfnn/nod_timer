import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

/**
 * Create an in-memory SQLite database with all tables for testing.
 * Returns a Drizzle ORM instance.
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");

  // Enable foreign keys
  sqlite.pragma("foreign_keys = ON");

  // Create all tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4A90D9',
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      billable INTEGER NOT NULL DEFAULT 0,
      hourly_rate REAL NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL DEFAULT '',
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      start_time TEXT NOT NULL,
      stop_time TEXT,
      duration_seconds INTEGER,
      billable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_entry_tags (
      time_entry_id INTEGER NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (time_entry_id, tag_id)
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
  `);

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
  `);

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}
