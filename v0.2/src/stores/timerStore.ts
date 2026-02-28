import { create } from "zustand";
import { db, type DrizzleDB } from "@/db/client";
import {
  createTimeEntry,
  getActiveEntry,
  stopEntry,
  updateTimeEntry,
  addTags,
  removeTags,
  getTagsForEntry,
} from "@/models/timeEntry";
import { nowISO, diffSeconds } from "@/utils/time";

/** Timer store state shape. */
export interface TimerState {
  /** Whether the timer is actively running */
  isRunning: boolean;
  /** ID of the active time entry in the database */
  activeEntryId: number | null;
  /** Description of the current task */
  description: string;
  /** Associated project ID */
  projectId: number | null;
  /** Associated tag IDs */
  tagIds: number[];
  /** Elapsed time in seconds since timer started */
  elapsedSeconds: number;
}

/** Timer store actions. */
export interface TimerActions {
  /** Start a new timer — creates a DB entry and begins counting. */
  startTimer: (
    description?: string,
    projectId?: number | null,
    tagIds?: number[],
  ) => Promise<void>;
  /** Stop the running timer — updates the DB entry with stop time and duration. */
  stopTimer: () => Promise<void>;
  /** Increment elapsed seconds by 1 (called every second by interval). */
  tick: () => void;
  /** Sync state from DB — check for an active entry on app start. */
  syncFromDB: () => Promise<void>;
  /** Update fields on the running timer (description, project, tags). */
  updateRunning: (fields: {
    description?: string;
    projectId?: number | null;
    tagIds?: number[];
  }) => Promise<void>;
  /** Reset the store to initial idle state. */
  reset: () => void;
}

const initialState: TimerState = {
  isRunning: false,
  activeEntryId: null,
  description: "",
  projectId: null,
  tagIds: [],
  elapsedSeconds: 0,
};

/** Get the DB instance. Exposed as a function so tests can override. */
let _dbRef: DrizzleDB | null = null;

export function setTimerDB(database: DrizzleDB): void {
  _dbRef = database;
}

function getDB(): DrizzleDB {
  if (_dbRef) return _dbRef;
  return db;
}

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  ...initialState,

  startTimer: async (
    description = "",
    projectId = null,
    tagIds = [],
  ) => {
    const database = getDB();

    // Create a new time entry in the database
    const entry = await createTimeEntry(database, {
      description,
      projectId: projectId ?? undefined,
      startTime: nowISO(),
    });

    // Add tags if any
    if (tagIds.length > 0) {
      await addTags(database, entry.id, tagIds);
    }

    set({
      isRunning: true,
      activeEntryId: entry.id,
      description,
      projectId,
      tagIds,
      elapsedSeconds: 0,
    });
  },

  stopTimer: async () => {
    const { activeEntryId } = get();
    if (!activeEntryId) return;

    const database = getDB();
    await stopEntry(database, activeEntryId);

    set({
      isRunning: false,
      activeEntryId: null,
      description: "",
      projectId: null,
      tagIds: [],
      elapsedSeconds: 0,
    });
  },

  tick: () => {
    set((state) => ({
      elapsedSeconds: state.elapsedSeconds + 1,
    }));
  },

  syncFromDB: async () => {
    const database = getDB();
    const active = await getActiveEntry(database);

    if (active) {
      // Calculate elapsed time from the start time
      const elapsed = diffSeconds(active.startTime, nowISO());

      // Load tags from the junction table
      const entryTags = await getTagsForEntry(database, active.id);
      const tagIds = entryTags.map((t) => t.id);

      set({
        isRunning: true,
        activeEntryId: active.id,
        description: active.description,
        projectId: active.projectId,
        tagIds,
        elapsedSeconds: elapsed,
      });
    } else {
      // No active entry — ensure we're in idle state
      set(initialState);
    }
  },

  updateRunning: async (fields) => {
    const { activeEntryId, isRunning } = get();
    if (!isRunning || !activeEntryId) return;

    const database = getDB();
    const updateData: Record<string, unknown> = {};

    if (fields.description !== undefined) {
      updateData.description = fields.description;
    }
    if (fields.projectId !== undefined) {
      updateData.projectId = fields.projectId;
    }

    // Update DB entry if there are field changes
    if (Object.keys(updateData).length > 0) {
      await updateTimeEntry(database, activeEntryId, updateData as any);
    }

    // Update tags in the junction table if tagIds changed
    if (fields.tagIds !== undefined) {
      const currentTagIds = get().tagIds;
      const newTagIds = fields.tagIds;

      // Remove tags that are no longer selected
      const tagsToRemove = currentTagIds.filter((id) => !newTagIds.includes(id));
      if (tagsToRemove.length > 0) {
        await removeTags(database, activeEntryId, tagsToRemove);
      }

      // Add newly selected tags
      const tagsToAdd = newTagIds.filter((id) => !currentTagIds.includes(id));
      if (tagsToAdd.length > 0) {
        await addTags(database, activeEntryId, tagsToAdd);
      }
    }

    // Update local state
    set((state) => ({
      ...state,
      ...(fields.description !== undefined
        ? { description: fields.description }
        : {}),
      ...(fields.projectId !== undefined
        ? { projectId: fields.projectId }
        : {}),
      ...(fields.tagIds !== undefined ? { tagIds: fields.tagIds } : {}),
    }));
  },

  reset: () => {
    set(initialState);
  },
}));
