import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const DATABASE_NAME = "timeflow.db";

// Open the SQLite database synchronously
const expoDb = openDatabaseSync(DATABASE_NAME);

// Create the Drizzle ORM instance
export const db = drizzle(expoDb, { schema });

export type DrizzleDB = typeof db;

/**
 * Initialize the database: enable WAL mode, foreign keys, and push the schema.
 * Call this once at app startup.
 */
export async function initDatabase(): Promise<void> {
  // Enable WAL mode for better concurrent read/write performance
  expoDb.execSync("PRAGMA journal_mode = WAL;");

  // Enable foreign key constraint enforcement
  expoDb.execSync("PRAGMA foreign_keys = ON;");

  // Create tables if they don't exist
  // Using raw SQL to push schema (Drizzle push for expo-sqlite)
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );
  `);

  expoDb.execSync(`
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

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  expoDb.execSync(`
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

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS time_entry_tags (
      time_entry_id INTEGER NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (time_entry_id, tag_id)
    );
  `);

  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Create indexes
  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
  `);

  expoDb.execSync(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
  `);
}
