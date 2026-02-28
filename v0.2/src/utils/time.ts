/**
 * Format a duration in seconds to "HH:MM:SS".
 * Handles negative values by returning "00:00:00".
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "00:00:00";
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format an ISO date string to "HH:MM" (24-hour).
 */
export function formatTimeShort(isoString: string): string {
  const date = new Date(isoString);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Format an ISO date string to "YYYY-MM-DD".
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Get ISO strings for the start and end of today (local time).
 */
export function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  return { start: toLocalISO(start), end: toLocalISO(end) };
}

/**
 * Get ISO strings for the start (Monday) and end (Sunday) of the current week.
 */
export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  // Calculate offset to Monday: if Sunday (0), go back 6 days
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
    23,
    59,
    59
  );
  return { start: toLocalISO(monday), end: toLocalISO(sunday) };
}

/**
 * Get ISO strings for the first and last day of the current month.
 */
export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0, // last day of current month
    23,
    59,
    59
  );
  return { start: toLocalISO(start), end: toLocalISO(end) };
}

/**
 * Get the current local time as "YYYY-MM-DDTHH:MM:SS".
 */
export function nowISO(): string {
  return toLocalISO(new Date());
}

/**
 * Calculate the difference in seconds between two ISO date strings.
 * Returns 0 if the result would be negative.
 */
export function diffSeconds(start: string, end: string): number {
  const diff = Math.floor(
    (new Date(end).getTime() - new Date(start).getTime()) / 1000
  );
  return Math.max(0, diff);
}

/**
 * Convert a Date to a local ISO string "YYYY-MM-DDTHH:MM:SS" (no timezone offset).
 */
export function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}
