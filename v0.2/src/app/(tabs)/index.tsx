import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/db/client";
import { Card, SectionHeader, EmptyState } from "@/components/ui";
import { MetricCard } from "@/components/MetricCard";
import { CapacityBar } from "@/components/CapacityBar";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Badge } from "@/components/ui";
import { formatDuration } from "@/utils/time";
import { getWorkingHours } from "@/models/settings";
import {
  getTodayTotal,
  getWeekTotal,
  getMonthTotal,
  getLast7Days,
  getProjectDistribution,
  getRecentEntries,
  getMostTrackedProject,
} from "@/services/dashboard";
import type { DailyHours, ProjectDistribution } from "@/types";

interface DashboardData {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  last7Days: DailyHours[];
  projectDistribution: ProjectDistribution[];
  recentEntries: Array<{
    id: number;
    description: string;
    durationSeconds: number;
    projectName: string | null;
    projectColor: string | null;
    startTime: string;
  }>;
  mostTracked: { name: string; hours: number; color: string } | null;
  workingHours: number;
}

/** Format seconds to decimal hours string. */
function toDecimalHours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

const DashboardScreen = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [
        todayTotal,
        weekTotal,
        monthTotal,
        last7Days,
        projectDistribution,
        recentEntries,
        mostTracked,
        workingHours,
      ] = await Promise.all([
        getTodayTotal(db),
        getWeekTotal(db),
        getMonthTotal(db),
        getLast7Days(db),
        getProjectDistribution(db),
        getRecentEntries(db, 5),
        getMostTrackedProject(db),
        getWorkingHours(db),
      ]);

      setData({
        todayTotal,
        weekTotal,
        monthTotal,
        last7Days,
        projectDistribution,
        recentEntries,
        mostTracked,
        workingHours,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-txt-secondary">Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00d4aa"
          />
        }
      >
        {/* Header */}
        <View className="px-screen-x pt-4 pb-2">
          <Text className="text-txt-primary text-2xl font-bold">Dashboard</Text>
        </View>

        {/* Metric cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pl-screen-x mb-section-gap"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <MetricCard
            label="Today"
            value={formatDuration(data.todayTotal)}
            subtitle={`${toDecimalHours(data.todayTotal)} hours`}
            icon={<Ionicons name="today-outline" size={14} color="#4A90D9" />}
            borderColor="#4A90D9"
          />
          <MetricCard
            label="This Week"
            value={formatDuration(data.weekTotal)}
            subtitle={`${toDecimalHours(data.weekTotal)} hours`}
            icon={
              <Ionicons
                name="calendar-outline"
                size={14}
                color="#00d4aa"
              />
            }
            borderColor="#00d4aa"
          />
          <MetricCard
            label="This Month"
            value={formatDuration(data.monthTotal)}
            subtitle={`${toDecimalHours(data.monthTotal)} hours`}
            icon={
              <Ionicons
                name="calendar-number-outline"
                size={14}
                color="#9b59b6"
              />
            }
            borderColor="#9b59b6"
          />
        </ScrollView>

        {/* Capacity bar */}
        <CapacityBar
          trackedSeconds={data.todayTotal}
          workingHours={data.workingHours}
          className="mb-section-gap"
        />

        {/* Last 7 Days chart */}
        <SectionHeader title="Last 7 Days" />
        <View className="px-screen-x mb-section-gap">
          <Card>
            <BarChart data={data.last7Days} height={160} />
          </Card>
        </View>

        {/* Project Distribution */}
        <SectionHeader title="Project Distribution" />
        <View className="px-screen-x mb-section-gap">
          <Card>
            <DonutChart data={data.projectDistribution} />
          </Card>
        </View>

        {/* Most Tracked Project */}
        {data.mostTracked && (
          <>
            <SectionHeader title="Most Tracked" />
            <View className="px-screen-x mb-section-gap">
              <Card
                variant="accent"
                accentColor={data.mostTracked.color}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-3 h-3 rounded-full mr-2.5"
                      style={{ backgroundColor: data.mostTracked.color }}
                    />
                    <Text className="text-txt-primary text-base font-semibold">
                      {data.mostTracked.name}
                    </Text>
                  </View>
                  <Text className="text-txt-primary text-base font-bold">
                    {data.mostTracked.hours.toFixed(1)}h
                  </Text>
                </View>
              </Card>
            </View>
          </>
        )}

        {/* Recent Entries */}
        <SectionHeader title="Recent Entries" />
        <View className="px-screen-x pb-8">
          {data.recentEntries.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons name="time-outline" size={40} color="#5a6270" />
              }
              title="No entries yet"
              description="Start tracking time to see your recent activity here."
            />
          ) : (
            <View className="gap-2">
              {data.recentEntries.map((entry) => (
                <Card key={entry.id}>
                  <View className="flex-row items-center">
                    {/* Project color dot */}
                    <View
                      className="w-2 h-2 rounded-full mr-2.5"
                      style={{
                        backgroundColor: entry.projectColor ?? "#4A90D9",
                      }}
                    />
                    {/* Description */}
                    <Text
                      className="text-txt-primary text-sm flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {entry.description || "No description"}
                    </Text>
                    {/* Duration */}
                    <Text
                      className="text-txt-secondary text-xs font-mono"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {formatDuration(entry.durationSeconds)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
