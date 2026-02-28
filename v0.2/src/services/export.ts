import type { GroupSummary } from "@/types";
import type { DetailedEntry, WeeklyReportRow } from "./reports";

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeCSV(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from an array of rows with the given column keys.
 *
 * @param rows    - Array of objects
 * @param columns - Array of keys to include (in order)
 * @param renameMap - Optional map of column key → display header name
 */
export function entriesToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T & string)[],
  renameMap?: Partial<Record<keyof T & string, string>>,
): string {
  const headers = columns.map((c) => escapeCSV(renameMap?.[c] ?? c));
  const lines = [headers.join(",")];

  for (const row of rows) {
    const vals = columns.map((c) => escapeCSV(row[c]));
    lines.push(vals.join(","));
  }

  return lines.join("\n");
}

/**
 * Generate CSV from a GroupSummary array (summary by project/client/day).
 *
 * @param data     - Summary rows
 * @param groupCol - Label for the first column (e.g., "Project", "Client", "Date")
 */
export function summaryToCSV(
  data: GroupSummary[],
  groupCol: string = "Group",
): string {
  const headers = [groupCol, "Entries", "Duration (h)", "Billable Amount"].map(
    escapeCSV,
  );
  const lines = [headers.join(",")];

  for (const row of data) {
    lines.push(
      [
        escapeCSV(row.name),
        escapeCSV(row.entriesCount),
        escapeCSV(row.totalHours),
        escapeCSV(row.billableAmount),
      ].join(","),
    );
  }

  // Grand total row
  const totalEntries = data.reduce((s, r) => s + r.entriesCount, 0);
  const totalHours = Math.round(
    data.reduce((s, r) => s + r.totalHours, 0) * 100,
  ) / 100;
  const totalBillable = Math.round(
    data.reduce((s, r) => s + r.billableAmount, 0) * 100,
  ) / 100;

  lines.push(
    [
      escapeCSV("TOTAL"),
      escapeCSV(totalEntries),
      escapeCSV(totalHours),
      escapeCSV(totalBillable),
    ].join(","),
  );

  return lines.join("\n");
}

/**
 * Generate CSV from the weekly report pivot data.
 */
export function weeklyToCSV(data: WeeklyReportRow[]): string {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const headers = ["Project", ...dayLabels, "Total"].map(escapeCSV);
  const lines = [headers.join(",")];

  for (const row of data) {
    lines.push(
      [
        escapeCSV(row.projectName),
        ...row.days.map((d) => escapeCSV(d)),
        escapeCSV(row.total),
      ].join(","),
    );
  }

  // Total row
  const totals: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const row of data) {
    for (let i = 0; i < 7; i++) {
      totals[i] += row.days[i];
    }
  }
  const grandTotal = Math.round(totals.reduce((a, b) => a + b, 0) * 100) / 100;
  const roundedTotals = totals.map((t) => Math.round(t * 100) / 100);

  lines.push(
    [
      escapeCSV("TOTAL"),
      ...roundedTotals.map((t) => escapeCSV(t)),
      escapeCSV(grandTotal),
    ].join(","),
  );

  return lines.join("\n");
}

/**
 * Generate CSV from detailed entry rows.
 */
export function detailedToCSV(entries: DetailedEntry[]): string {
  const columns = [
    "description",
    "projectName",
    "clientName",
    "startTime",
    "stopTime",
    "durationSeconds",
    "billable",
    "billableAmount",
    "tags",
  ] as const;

  const renameMap: Record<string, string> = {
    description: "Description",
    projectName: "Project",
    clientName: "Client",
    startTime: "Start",
    stopTime: "Stop",
    durationSeconds: "Duration (s)",
    billable: "Billable",
    billableAmount: "Amount",
    tags: "Tags",
  };

  const headers = columns.map((c) => escapeCSV(renameMap[c] ?? c));
  const lines = [headers.join(",")];

  for (const entry of entries) {
    const tagNames = entry.tags.map((t) => t.name).join("; ");
    lines.push(
      [
        escapeCSV(entry.description),
        escapeCSV(entry.projectName ?? ""),
        escapeCSV(entry.clientName ?? ""),
        escapeCSV(entry.startTime),
        escapeCSV(entry.stopTime),
        escapeCSV(entry.durationSeconds),
        escapeCSV(entry.billable ? "Yes" : "No"),
        escapeCSV(entry.billableAmount),
        escapeCSV(tagNames),
      ].join(","),
    );
  }

  return lines.join("\n");
}

/**
 * Share a CSV file using expo-file-system + expo-sharing.
 * This is a no-op in tests / environments without these modules.
 */
export async function shareCSV(
  csvString: string,
  filename: string,
): Promise<void> {
  try {
    // Dynamic imports so the module works in test environments
    const FileSystem = require("expo-file-system");
    const Sharing = require("expo-sharing");

    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: `Export ${filename}`,
        UTI: "public.comma-separated-values-text",
      });
    }
  } catch {
    // Silently fail in environments where expo-file-system/expo-sharing aren't available
    console.warn("Sharing not available in this environment");
  }
}
