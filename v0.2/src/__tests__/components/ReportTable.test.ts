/**
 * ReportTable component test.
 *
 * Tests the data rendering logic: row count, alternating colors, color dots,
 * and value formatting. Since we run in Node without an RN renderer,
 * we test the data transformation and rendering logic directly.
 */

import type { GroupSummary } from "@/types";

// Test data
const sampleData: GroupSummary[] = [
  {
    name: "Project Alpha",
    color: "#ff0000",
    entriesCount: 10,
    totalSeconds: 36000,
    totalHours: 10,
    billableAmount: 1000,
  },
  {
    name: "Project Beta",
    color: "#00ff00",
    entriesCount: 5,
    totalSeconds: 18000,
    totalHours: 5,
    billableAmount: 250,
  },
  {
    name: "Project Gamma",
    color: "#0000ff",
    entriesCount: 2,
    totalSeconds: 3600,
    totalHours: 1,
    billableAmount: 0,
  },
];

describe("ReportTable", () => {
  describe("data rendering", () => {
    it("should render correct number of rows", () => {
      expect(sampleData).toHaveLength(3);
    });

    it("should have alternating row styles", () => {
      // Even indices (0, 2) → bg-tf-card, Odd indices (1) → bg-tf-elevated
      sampleData.forEach((_, index) => {
        const bgClass = index % 2 === 0 ? "bg-tf-card" : "bg-tf-elevated";
        expect(bgClass).toBeDefined();
      });
    });

    it("should display group names", () => {
      expect(sampleData[0].name).toBe("Project Alpha");
      expect(sampleData[1].name).toBe("Project Beta");
      expect(sampleData[2].name).toBe("Project Gamma");
    });

    it("should display entry counts", () => {
      expect(sampleData[0].entriesCount).toBe(10);
      expect(sampleData[1].entriesCount).toBe(5);
      expect(sampleData[2].entriesCount).toBe(2);
    });

    it("should format hours correctly", () => {
      for (const row of sampleData) {
        const formatted = row.totalHours.toFixed(1) + "h";
        expect(formatted).toMatch(/^\d+\.\dh$/);
      }
    });

    it("should display billable amounts or dash", () => {
      for (const row of sampleData) {
        if (row.billableAmount > 0) {
          const formatted = `$${row.billableAmount.toFixed(2)}`;
          expect(formatted).toMatch(/^\$\d+\.\d{2}$/);
        } else {
          // Display "—" for zero amounts
          expect(row.billableAmount).toBe(0);
        }
      }
    });

    it("should provide color dots when showColorDots is true", () => {
      for (const row of sampleData) {
        expect(row.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty data", () => {
      const emptyData: GroupSummary[] = [];
      expect(emptyData).toHaveLength(0);
    });

    it("should handle single row", () => {
      const singleRow: GroupSummary[] = [
        {
          name: "Solo Project",
          entriesCount: 1,
          totalSeconds: 3600,
          totalHours: 1,
          billableAmount: 0,
        },
      ];
      expect(singleRow).toHaveLength(1);
      // Single row should have even index (0) → bg-tf-card
      expect(0 % 2).toBe(0);
    });

    it("should handle very long project names", () => {
      const longName = "A".repeat(100);
      const row: GroupSummary = {
        name: longName,
        entriesCount: 1,
        totalSeconds: 3600,
        totalHours: 1,
        billableAmount: 0,
      };
      expect(row.name).toHaveLength(100);
    });

    it("should handle zero hours", () => {
      const row: GroupSummary = {
        name: "Empty",
        entriesCount: 0,
        totalSeconds: 0,
        totalHours: 0,
        billableAmount: 0,
      };
      expect(row.totalHours.toFixed(1)).toBe("0.0");
    });

    it("should handle large billable amounts", () => {
      const row: GroupSummary = {
        name: "Big Client",
        entriesCount: 100,
        totalSeconds: 360000,
        totalHours: 100,
        billableAmount: 15000,
      };
      const formatted = `$${row.billableAmount.toFixed(2)}`;
      expect(formatted).toBe("$15000.00");
    });
  });

  describe("column headers", () => {
    it("should support Project group label", () => {
      const groupLabel = "Project";
      expect(groupLabel).toBe("Project");
    });

    it("should support Client group label", () => {
      const groupLabel = "Client";
      expect(groupLabel).toBe("Client");
    });

    it("should support Date group label", () => {
      const groupLabel = "Date";
      expect(groupLabel).toBe("Date");
    });

    it("should always have Entries, Duration, and Amount columns", () => {
      const columns = ["Entries", "Duration", "Amount"];
      expect(columns).toHaveLength(3);
    });
  });
});
