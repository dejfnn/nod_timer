import {
  entriesToCSV,
  summaryToCSV,
  weeklyToCSV,
  detailedToCSV,
} from "@/services/export";
import type { GroupSummary } from "@/types";
import type { WeeklyReportRow, DetailedEntry } from "@/services/reports";

describe("Export service", () => {
  // -----------------------------------------------------------------------
  // entriesToCSV
  // -----------------------------------------------------------------------
  describe("entriesToCSV", () => {
    it("should generate CSV with correct headers", () => {
      const rows = [
        { name: "Alice", age: 30, city: "Prague" },
        { name: "Bob", age: 25, city: "Brno" },
      ];

      const csv = entriesToCSV(rows, ["name", "age", "city"]);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("name,age,city");
      expect(lines[1]).toBe("Alice,30,Prague");
      expect(lines[2]).toBe("Bob,25,Brno");
    });

    it("should use rename map for headers", () => {
      const rows = [{ firstName: "Alice", lastName: "Smith" }];

      const csv = entriesToCSV(rows, ["firstName", "lastName"], {
        firstName: "First Name",
        lastName: "Last Name",
      });

      const lines = csv.split("\n");
      expect(lines[0]).toBe("First Name,Last Name");
    });

    it("should escape values with commas", () => {
      const rows = [{ description: "Fix bug, deploy" }];

      const csv = entriesToCSV(rows, ["description"]);
      const lines = csv.split("\n");

      expect(lines[1]).toBe('"Fix bug, deploy"');
    });

    it("should escape values with quotes", () => {
      const rows = [{ description: 'He said "hello"' }];

      const csv = entriesToCSV(rows, ["description"]);
      const lines = csv.split("\n");

      expect(lines[1]).toBe('"He said ""hello"""');
    });

    it("should escape values with newlines", () => {
      const rows = [{ description: "Line1\nLine2" }];

      const csv = entriesToCSV(rows, ["description"]);
      const lines = csv.split("\n");

      // The escaped value with quotes is on the first data "line" (lines[1] + lines[2])
      expect(csv).toContain('"Line1\nLine2"');
    });

    it("should handle null and undefined values", () => {
      const rows = [{ a: null, b: undefined, c: "" }];

      const csv = entriesToCSV(rows as any, ["a", "b", "c"]);
      const lines = csv.split("\n");

      expect(lines[1]).toBe(",,");
    });

    it("should handle empty rows array", () => {
      const csv = entriesToCSV([], ["a", "b"]);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(1); // Just headers
      expect(lines[0]).toBe("a,b");
    });
  });

  // -----------------------------------------------------------------------
  // summaryToCSV
  // -----------------------------------------------------------------------
  describe("summaryToCSV", () => {
    it("should generate correct CSV for summary data", () => {
      const data: GroupSummary[] = [
        {
          name: "Project A",
          color: "#ff0000",
          entriesCount: 5,
          totalSeconds: 18000,
          totalHours: 5,
          billableAmount: 500,
        },
        {
          name: "Project B",
          color: "#00ff00",
          entriesCount: 3,
          totalSeconds: 10800,
          totalHours: 3,
          billableAmount: 150,
        },
      ];

      const csv = summaryToCSV(data, "Project");
      const lines = csv.split("\n");

      expect(lines[0]).toBe("Project,Entries,Duration (h),Billable Amount");
      expect(lines[1]).toBe("Project A,5,5,500");
      expect(lines[2]).toBe("Project B,3,3,150");
      // TOTAL row
      expect(lines[3]).toBe("TOTAL,8,8,650");
    });

    it("should use custom group column name", () => {
      const data: GroupSummary[] = [
        {
          name: "Client X",
          entriesCount: 2,
          totalSeconds: 7200,
          totalHours: 2,
          billableAmount: 0,
        },
      ];

      const csv = summaryToCSV(data, "Client");
      expect(csv.split("\n")[0]).toBe("Client,Entries,Duration (h),Billable Amount");
    });

    it("should handle empty data", () => {
      const csv = summaryToCSV([], "Group");
      const lines = csv.split("\n");

      expect(lines).toHaveLength(2); // Header + TOTAL
      expect(lines[1]).toBe("TOTAL,0,0,0");
    });
  });

  // -----------------------------------------------------------------------
  // weeklyToCSV
  // -----------------------------------------------------------------------
  describe("weeklyToCSV", () => {
    it("should generate correct pivot CSV", () => {
      const data: WeeklyReportRow[] = [
        {
          projectId: 1,
          projectName: "Alpha",
          projectColor: "#ff0000",
          days: [2, 0, 1.5, 0, 3, 0, 0],
          total: 6.5,
        },
        {
          projectId: 2,
          projectName: "Beta",
          projectColor: "#00ff00",
          days: [0, 1, 0, 2, 0, 0, 0],
          total: 3,
        },
      ];

      const csv = weeklyToCSV(data);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("Project,Mon,Tue,Wed,Thu,Fri,Sat,Sun,Total");
      expect(lines[1]).toBe("Alpha,2,0,1.5,0,3,0,0,6.5");
      expect(lines[2]).toBe("Beta,0,1,0,2,0,0,0,3");
      // TOTAL row
      expect(lines[3]).toBe("TOTAL,2,1,1.5,2,3,0,0,9.5");
    });

    it("should handle empty data", () => {
      const csv = weeklyToCSV([]);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(2); // Header + TOTAL
      expect(lines[1]).toBe("TOTAL,0,0,0,0,0,0,0,0");
    });
  });

  // -----------------------------------------------------------------------
  // detailedToCSV
  // -----------------------------------------------------------------------
  describe("detailedToCSV", () => {
    it("should generate CSV with all detail columns", () => {
      const entries: DetailedEntry[] = [
        {
          id: 1,
          description: "Task A",
          startTime: "2025-06-15T09:00:00",
          stopTime: "2025-06-15T10:00:00",
          durationSeconds: 3600,
          billable: 1,
          projectId: 1,
          projectName: "ProjectX",
          projectColor: "#aaa",
          clientId: 1,
          clientName: "ClientY",
          hourlyRate: 100,
          billableAmount: 100,
          tags: [
            { id: 1, name: "dev" },
            { id: 2, name: "review" },
          ],
        },
      ];

      const csv = detailedToCSV(entries);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Description,Project,Client,Start,Stop,Duration (s),Billable,Amount,Tags",
      );
      expect(lines[1]).toBe(
        "Task A,ProjectX,ClientY,2025-06-15T09:00:00,2025-06-15T10:00:00,3600,Yes,100,dev; review",
      );
    });

    it("should handle entries without project or tags", () => {
      const entries: DetailedEntry[] = [
        {
          id: 1,
          description: "Plain entry",
          startTime: "2025-06-15T09:00:00",
          stopTime: "2025-06-15T10:00:00",
          durationSeconds: 3600,
          billable: 0,
          projectId: null,
          projectName: null,
          projectColor: null,
          clientId: null,
          clientName: null,
          hourlyRate: 0,
          billableAmount: 0,
          tags: [],
        },
      ];

      const csv = detailedToCSV(entries);
      const lines = csv.split("\n");

      expect(lines[1]).toBe(
        "Plain entry,,,2025-06-15T09:00:00,2025-06-15T10:00:00,3600,No,0,",
      );
    });

    it("should handle empty entries array", () => {
      const csv = detailedToCSV([]);
      const lines = csv.split("\n");

      expect(lines).toHaveLength(1); // Just headers
    });
  });
});
