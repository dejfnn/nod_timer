import { createTestDb } from "../helpers/testDb";

// Mock the DB client module to avoid expo-sqlite import
jest.mock("@/db/client", () => {
  return {
    db: null,
    initDatabase: jest.fn(),
  };
});

import { useTimerStore, setTimerDB } from "@/stores/timerStore";
import { getActiveEntry, getAllTimeEntries } from "@/models/timeEntry";

describe("timerStore", () => {
  let db: any;
  let sqlite: any;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqlite = testDb.sqlite;

    // Point the store at the test database
    setTimerDB(db);

    // Reset the store to initial state before each test
    useTimerStore.getState().reset();
  });

  afterEach(() => {
    sqlite.close();
  });

  describe("initial state", () => {
    it("should have correct defaults", () => {
      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.activeEntryId).toBeNull();
      expect(state.description).toBe("");
      expect(state.projectId).toBeNull();
      expect(state.tagIds).toEqual([]);
      expect(state.elapsedSeconds).toBe(0);
    });
  });

  describe("startTimer", () => {
    it("should create a DB entry and set isRunning to true", async () => {
      await useTimerStore.getState().startTimer("Test task", null, []);

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.activeEntryId).toBe(1);
      expect(state.description).toBe("Test task");
      expect(state.projectId).toBeNull();
      expect(state.tagIds).toEqual([]);
      expect(state.elapsedSeconds).toBe(0);
    });

    it("should persist entry to database", async () => {
      await useTimerStore.getState().startTimer("DB check");

      const active = await getActiveEntry(db);
      expect(active).toBeDefined();
      expect(active!.description).toBe("DB check");
      expect(active!.stopTime).toBeNull();
    });

    it("should accept project ID", async () => {
      // Create a project first
      sqlite.exec(`INSERT INTO projects (name) VALUES ('TestProject')`);

      await useTimerStore.getState().startTimer("With project", 1, []);

      const state = useTimerStore.getState();
      expect(state.projectId).toBe(1);

      const active = await getActiveEntry(db);
      expect(active!.projectId).toBe(1);
    });
  });

  describe("stopTimer", () => {
    it("should stop the timer and reset state", async () => {
      await useTimerStore.getState().startTimer("Stopping test");
      await useTimerStore.getState().stopTimer();

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.activeEntryId).toBeNull();
      expect(state.description).toBe("");
      expect(state.elapsedSeconds).toBe(0);
    });

    it("should set stopTime and durationSeconds in the database", async () => {
      await useTimerStore.getState().startTimer("Duration test");
      await useTimerStore.getState().stopTimer();

      const entries = await getAllTimeEntries(db);
      expect(entries).toHaveLength(1);
      expect(entries[0].stopTime).not.toBeNull();
      expect(entries[0].durationSeconds).toBeDefined();
      // Duration should be >= 0 (test runs fast, so it may be 0)
      expect(entries[0].durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it("should do nothing if no active timer", async () => {
      // Should not throw
      await useTimerStore.getState().stopTimer();

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(false);
    });
  });

  describe("tick", () => {
    it("should increment elapsedSeconds by 1", () => {
      // Manually set isRunning for the test
      useTimerStore.setState({ isRunning: true, elapsedSeconds: 0 });

      useTimerStore.getState().tick();
      expect(useTimerStore.getState().elapsedSeconds).toBe(1);

      useTimerStore.getState().tick();
      expect(useTimerStore.getState().elapsedSeconds).toBe(2);

      useTimerStore.getState().tick();
      expect(useTimerStore.getState().elapsedSeconds).toBe(3);
    });
  });

  describe("syncFromDB", () => {
    it("should restore state from an active DB entry", async () => {
      // Create an active entry directly in DB
      sqlite.exec(`
        INSERT INTO time_entries (description, start_time)
        VALUES ('Resumed task', '2020-01-01T09:00:00')
      `);

      await useTimerStore.getState().syncFromDB();

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.activeEntryId).toBe(1);
      expect(state.description).toBe("Resumed task");
      // elapsedSeconds should be > 0 since the start time is in the past
      expect(state.elapsedSeconds).toBeGreaterThan(0);
    });

    it("should set idle state when no active entry exists", async () => {
      // Create a completed entry
      sqlite.exec(`
        INSERT INTO time_entries (description, start_time, stop_time, duration_seconds)
        VALUES ('Completed', '2024-01-01T09:00:00', '2024-01-01T10:00:00', 3600)
      `);

      await useTimerStore.getState().syncFromDB();

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.activeEntryId).toBeNull();
    });
  });

  describe("updateRunning", () => {
    it("should update description on running timer", async () => {
      await useTimerStore.getState().startTimer("Original");

      await useTimerStore.getState().updateRunning({
        description: "Updated",
      });

      const state = useTimerStore.getState();
      expect(state.description).toBe("Updated");
    });

    it("should do nothing when timer is not running", async () => {
      await useTimerStore.getState().updateRunning({
        description: "Should not change",
      });

      const state = useTimerStore.getState();
      expect(state.description).toBe("");
    });
  });

  describe("reset", () => {
    it("should return store to initial state", async () => {
      await useTimerStore.getState().startTimer("Will be reset");

      useTimerStore.getState().reset();

      const state = useTimerStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.activeEntryId).toBeNull();
      expect(state.description).toBe("");
      expect(state.projectId).toBeNull();
      expect(state.tagIds).toEqual([]);
      expect(state.elapsedSeconds).toBe(0);
    });
  });
});
