import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SectionList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/db/client";
import { Card, Badge, EmptyState } from "@/components/ui";
import { DatePresetBar } from "@/components/DatePresetBar";
import { ReportFilters } from "@/components/ReportFilters";
import { ReportTable } from "@/components/ReportTable";
import { DayHeader } from "@/components/DayHeader";
import { GrandTotalBar } from "@/components/GrandTotalBar";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { HeatmapGrid } from "@/components/charts/HeatmapGrid";
import {
  summaryByProject,
  summaryByClient,
  summaryByDay,
  detailedReport,
  weeklyReport,
} from "@/services/reports";
import type { DetailedEntry, WeeklyReportRow } from "@/services/reports";
import {
  summaryToCSV,
  detailedToCSV,
  weeklyToCSV,
  shareCSV,
} from "@/services/export";
import { getAllProjects } from "@/models/project";
import { getAllClients } from "@/models/client";
import { getAllTags } from "@/models/tag";
import {
  getTodayRange,
  getWeekRange,
  getMonthRange,
  formatDuration,
  formatTimeShort,
  formatDate,
  toLocalISO,
} from "@/utils/time";
import type {
  DatePreset,
  ReportFilters as FilterType,
  GroupSummary,
  Project,
  Client,
  Tag,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportTab = "summary" | "detailed" | "weekly";
type SummaryGroupBy = "project" | "client" | "day";

interface DateRange {
  start: string;
  end: string;
}

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

function getLastMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { start: toLocalISO(start), end: toLocalISO(end) };
}

function getRangeForPreset(preset: DatePreset): DateRange {
  switch (preset) {
    case "today":
      return getTodayRange();
    case "this_week":
      return getWeekRange();
    case "this_month":
      return getMonthRange();
    case "last_month":
      return getLastMonthRange();
    case "custom":
      return getMonthRange(); // Default to month for custom
  }
}

function formatRangeLabel(range: DateRange): string {
  const s = formatDate(range.start);
  const e = formatDate(range.end);
  return s === e ? s : `${s} — ${e}`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ReportsScreen = () => {
  // State
  const [preset, setPreset] = useState<DatePreset>("this_week");
  const [range, setRange] = useState<DateRange>(() => getRangeForPreset("this_week"));
  const [filters, setFilters] = useState<FilterType>({});
  const [tab, setTab] = useState<ReportTab>("summary");
  const [groupBy, setGroupBy] = useState<SummaryGroupBy>("project");
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [summaryData, setSummaryData] = useState<GroupSummary[]>([]);
  const [detailedData, setDetailedData] = useState<DetailedEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyReportRow[]>([]);

  // Filter options
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [clientList, setClientList] = useState<Client[]>([]);
  const [tagList, setTagList] = useState<Tag[]>([]);

  // Loading
  const [loading, setLoading] = useState(false);

  // Load filter options once
  useEffect(() => {
    (async () => {
      const [p, c, t] = await Promise.all([
        getAllProjects(db),
        getAllClients(db),
        getAllTags(db),
      ]);
      setProjectList(p);
      setClientList(c);
      setTagList(t);
    })();
  }, []);

  // Handle preset change
  const handlePresetChange = useCallback((p: DatePreset) => {
    setPreset(p);
    if (p !== "custom") {
      setRange(getRangeForPreset(p));
    }
  }, []);

  // Load report data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = range;

      if (tab === "summary") {
        let data: GroupSummary[];
        switch (groupBy) {
          case "project":
            data = await summaryByProject(db, start, end, filters);
            break;
          case "client":
            data = await summaryByClient(db, start, end, filters);
            break;
          case "day":
            data = await summaryByDay(db, start, end, filters);
            break;
        }
        setSummaryData(data);
      } else if (tab === "detailed") {
        const data = await detailedReport(db, start, end, filters);
        setDetailedData(data);
      } else {
        const data = await weeklyReport(db, start, end, filters);
        setWeeklyData(data);
      }
    } catch (e) {
      console.error("Report load error:", e);
    } finally {
      setLoading(false);
    }
  }, [range, filters, tab, groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Computed grand totals
  const summaryTotals = useMemo(() => {
    const entries = summaryData.reduce((s, r) => s + r.entriesCount, 0);
    const seconds = summaryData.reduce((s, r) => s + r.totalSeconds, 0);
    const billable = Math.round(
      summaryData.reduce((s, r) => s + r.billableAmount, 0) * 100,
    ) / 100;
    return { entries, seconds, billable };
  }, [summaryData]);

  const detailedTotals = useMemo(() => {
    const entries = detailedData.length;
    const seconds = detailedData.reduce((s, r) => s + r.durationSeconds, 0);
    const billable = Math.round(
      detailedData.reduce((s, r) => s + r.billableAmount, 0) * 100,
    ) / 100;
    return { entries, seconds, billable };
  }, [detailedData]);

  const weeklyTotals = useMemo(() => {
    // Weekly pivot data has project rows, not individual time entries,
    // so we cannot derive entry count here — set to 0.
    const seconds = Math.round(
      weeklyData.reduce((s, r) => s + r.total, 0) * 3600,
    );
    return { entries: 0, seconds, billable: 0 };
  }, [weeklyData]);

  // Detailed entries grouped by day for SectionList
  const detailedSections = useMemo(() => {
    const groups = new Map<
      string,
      { entries: DetailedEntry[]; totalSeconds: number }
    >();

    for (const entry of detailedData) {
      const date = formatDate(entry.startTime);
      const g = groups.get(date) ?? { entries: [], totalSeconds: 0 };
      g.entries.push(entry);
      g.totalSeconds += entry.durationSeconds;
      groups.set(date, g);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, group]) => ({
        date,
        totalSeconds: group.totalSeconds,
        entriesCount: group.entries.length,
        data: group.entries,
      }));
  }, [detailedData]);

  // Chart data for summary
  const chartData = useMemo(
    () =>
      summaryData.map((row) => ({
        label: row.name,
        value: row.totalHours,
        color: row.color ?? "#4A90D9",
      })),
    [summaryData],
  );

  // Export handler
  const handleExport = useCallback(async () => {
    try {
      let csv: string;
      let filename: string;

      if (tab === "summary") {
        const groupLabel =
          groupBy === "project"
            ? "Project"
            : groupBy === "client"
              ? "Client"
              : "Date";
        csv = summaryToCSV(summaryData, groupLabel);
        filename = `timeflow-summary-${groupBy}-${formatDate(range.start)}.csv`;
      } else if (tab === "detailed") {
        csv = detailedToCSV(detailedData);
        filename = `timeflow-detailed-${formatDate(range.start)}.csv`;
      } else {
        csv = weeklyToCSV(weeklyData);
        filename = `timeflow-weekly-${formatDate(range.start)}.csv`;
      }

      await shareCSV(csv, filename);
    } catch (e) {
      Alert.alert("Export Error", "Failed to export CSV file.");
    }
  }, [tab, groupBy, summaryData, detailedData, weeklyData, range]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const TABS: { key: ReportTab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "detailed", label: "Detailed" },
    { key: "weekly", label: "Weekly" },
  ];

  const GROUP_OPTIONS: { key: SummaryGroupBy; label: string }[] = [
    { key: "project", label: "Project" },
    { key: "client", label: "Client" },
    { key: "day", label: "Day" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      {/* Header */}
      <View className="px-screen-x pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-txt-primary text-2xl font-bold">Reports</Text>
        <Pressable
          onPress={handleExport}
          className="flex-row items-center bg-tf-elevated border border-tf-border rounded-xl px-3 py-2"
          style={({ pressed }) => [
            pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="download-outline" size={16} color="#00d4aa" />
          <Text className="text-accent text-sm font-medium ml-1.5">
            Export CSV
          </Text>
        </Pressable>
      </View>

      {/* Date Presets */}
      <DatePresetBar
        selected={preset}
        onSelect={handlePresetChange}
        className="mt-1 mb-2"
      />

      {/* Range label */}
      <View className="px-screen-x mb-2">
        <Badge
          label={formatRangeLabel(range)}
          variant="info"
          size="sm"
        />
      </View>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        projects={projectList}
        clients={clientList}
        tags={tagList}
      />

      {/* Tab bar */}
      <View className="flex-row px-screen-x mt-2 mb-3" style={{ gap: 4 }}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl items-center ${
              tab === t.key
                ? "bg-accent"
                : "bg-tf-elevated border border-tf-border"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === t.key ? "text-tf-deep" : "text-txt-secondary"
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {tab === "summary" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4aa"
            />
          }
        >
          {/* Group by selector */}
          <View className="flex-row px-screen-x mb-4" style={{ gap: 6 }}>
            {GROUP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setGroupBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg border ${
                  groupBy === opt.key
                    ? "bg-primary border-primary"
                    : "bg-tf-elevated border-tf-border"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    groupBy === opt.key ? "text-white" : "text-txt-secondary"
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {summaryData.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons
                  name="bar-chart-outline"
                  size={56}
                  color="#5a6270"
                />
              }
              title="No data for this period"
              description="Try a different date range or adjust filters."
            />
          ) : (
            <>
              {/* Chart */}
              <View className="px-screen-x mb-4">
                <Card>
                  <HorizontalBarChart data={chartData} />
                </Card>
              </View>

              {/* Table */}
              <View className="px-screen-x mb-4">
                <ReportTable
                  data={summaryData}
                  groupLabel={
                    groupBy === "project"
                      ? "Project"
                      : groupBy === "client"
                        ? "Client"
                        : "Date"
                  }
                  showColorDots={groupBy === "project"}
                />
              </View>

              {/* Grand total */}
              <View className="px-screen-x">
                <GrandTotalBar
                  totalEntries={summaryTotals.entries}
                  totalSeconds={summaryTotals.seconds}
                  totalBillable={summaryTotals.billable}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}

      {tab === "detailed" && (
        <>
          {detailedData.length === 0 ? (
            <View className="flex-1">
              <EmptyState
                icon={
                  <Ionicons
                    name="list-outline"
                    size={56}
                    color="#5a6270"
                  />
                }
                title="No entries for this period"
                description="Try a different date range or adjust filters."
              />
            </View>
          ) : (
            <SectionList
              sections={detailedSections}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#00d4aa"
                />
              }
              renderSectionHeader={({ section }) => (
                <DayHeader
                  date={section.date}
                  totalSeconds={section.totalSeconds}
                  entriesCount={section.entriesCount}
                />
              )}
              renderItem={({ item }) => (
                <View className="px-screen-x py-2.5 border-b border-tf-border flex-row items-center">
                  {/* Project color dot */}
                  <View
                    className="w-2 h-2 rounded-full mr-3"
                    style={{
                      backgroundColor: item.projectColor ?? "#4A90D9",
                    }}
                  />

                  {/* Entry info */}
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-sm text-txt-primary font-medium"
                      numberOfLines={1}
                    >
                      {item.description || "Untitled"}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      {item.projectName && (
                        <Text className="text-xs text-txt-muted mr-2">
                          {item.projectName}
                        </Text>
                      )}
                      <Text className="text-xs text-txt-faint">
                        {formatTimeShort(item.startTime)} —{" "}
                        {formatTimeShort(item.stopTime)}
                      </Text>
                    </View>
                    {item.tags.length > 0 && (
                      <View className="flex-row mt-1" style={{ gap: 4 }}>
                        {item.tags.map((t) => (
                          <Badge
                            key={t.id}
                            label={t.name}
                            variant="default"
                            size="sm"
                          />
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Duration + billable */}
                  <View className="items-end">
                    <Text className="text-sm font-mono font-semibold text-txt-primary">
                      {formatDuration(item.durationSeconds)}
                    </Text>
                    {item.billable === 1 && item.billableAmount > 0 && (
                      <Text className="text-xs font-mono text-success mt-0.5">
                        ${item.billableAmount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              ListFooterComponent={
                <View className="px-screen-x mt-3">
                  <GrandTotalBar
                    totalEntries={detailedTotals.entries}
                    totalSeconds={detailedTotals.seconds}
                    totalBillable={detailedTotals.billable}
                  />
                </View>
              }
            />
          )}
        </>
      )}

      {tab === "weekly" && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4aa"
            />
          }
        >
          {weeklyData.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons
                  name="grid-outline"
                  size={56}
                  color="#5a6270"
                />
              }
              title="No weekly data"
              description="Try a different date range or adjust filters."
            />
          ) : (
            <>
              <View className="px-screen-x mb-4">
                <Card>
                  <HeatmapGrid data={weeklyData} />
                </Card>
              </View>

              <View className="px-screen-x">
                <GrandTotalBar
                  totalEntries={weeklyTotals.entries}
                  totalSeconds={weeklyTotals.seconds}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ReportsScreen;
