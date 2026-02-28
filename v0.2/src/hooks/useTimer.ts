import { useEffect, useRef } from "react";
import { useTimerStore } from "@/stores/timerStore";

/**
 * Hook that manages the timer interval and syncs state from the database.
 *
 * - On mount: calls syncFromDB() to restore a running timer if the app was restarted.
 * - When isRunning changes: sets up / tears down a 1-second interval that calls tick().
 *
 * Returns the full timer store state and actions for convenience.
 */
export function useTimer() {
  const store = useTimerStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync from DB on mount to resume any running timer
  useEffect(() => {
    store.syncFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up / tear down 1-second tick interval
  useEffect(() => {
    if (store.isRunning) {
      intervalRef.current = setInterval(() => {
        useTimerStore.getState().tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [store.isRunning]);

  return store;
}
