import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/components/ui";
import type { Project, Client, Tag, ReportFilters as FilterType } from "@/types";

interface ReportFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  projects: Project[];
  clients: Client[];
  tags: Tag[];
  className?: string;
}

export const ReportFilters = ({
  filters,
  onFiltersChange,
  projects,
  clients,
  tags,
  className = "",
}: ReportFiltersProps) => {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (filters.projectIds?.length ?? 0) +
    (filters.clientIds?.length ?? 0) +
    (filters.tagIds?.length ?? 0) +
    (filters.billableOnly ? 1 : 0);

  const toggleProject = (id: number) => {
    const current = filters.projectIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onFiltersChange({ ...filters, projectIds: next.length ? next : undefined });
  };

  const toggleClient = (id: number) => {
    const current = filters.clientIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onFiltersChange({ ...filters, clientIds: next.length ? next : undefined });
  };

  const toggleTag = (id: number) => {
    const current = filters.tagIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onFiltersChange({ ...filters, tagIds: next.length ? next : undefined });
  };

  const toggleBillable = () => {
    onFiltersChange({ ...filters, billableOnly: !filters.billableOnly });
  };

  return (
    <View className={`px-screen-x ${className}`}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-2"
      >
        <View className="flex-row items-center">
          <Ionicons name="filter-outline" size={16} color="#9aa0b0" />
          <Text className="text-txt-secondary text-sm font-medium ml-2">
            Filters
          </Text>
          {activeCount > 0 && (
            <View className="ml-2 bg-accent rounded-full w-5 h-5 items-center justify-center">
              <Text className="text-tf-deep text-xs font-bold">
                {activeCount}
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#5a6270"
        />
      </Pressable>

      {expanded && (
        <View className="mt-2 space-y-3">
          {/* Projects */}
          {projects.length > 0 && (
            <View className="mb-3">
              <Text className="text-xs text-txt-muted uppercase mb-2" style={{ letterSpacing: 1 }}>
                Projects
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row" style={{ gap: 6 }}>
                  {projects.map((p) => {
                    const isSelected = filters.projectIds?.includes(p.id);
                    return (
                      <Pressable key={p.id} onPress={() => toggleProject(p.id)}>
                        <Badge
                          label={p.name}
                          variant={isSelected ? "active" : "default"}
                          dot
                          color={isSelected ? undefined : p.color}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Clients */}
          {clients.length > 0 && (
            <View className="mb-3">
              <Text className="text-xs text-txt-muted uppercase mb-2" style={{ letterSpacing: 1 }}>
                Clients
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row" style={{ gap: 6 }}>
                  {clients.map((c) => {
                    const isSelected = filters.clientIds?.includes(c.id);
                    return (
                      <Pressable key={c.id} onPress={() => toggleClient(c.id)}>
                        <Badge
                          label={c.name}
                          variant={isSelected ? "active" : "default"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View className="mb-3">
              <Text className="text-xs text-txt-muted uppercase mb-2" style={{ letterSpacing: 1 }}>
                Tags
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row" style={{ gap: 6 }}>
                  {tags.map((t) => {
                    const isSelected = filters.tagIds?.includes(t.id);
                    return (
                      <Pressable key={t.id} onPress={() => toggleTag(t.id)}>
                        <Badge
                          label={t.name}
                          variant={isSelected ? "active" : "default"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Billable toggle */}
          <Pressable
            onPress={toggleBillable}
            className="flex-row items-center mb-2"
          >
            <View
              className={`w-5 h-5 rounded border items-center justify-center mr-2 ${
                filters.billableOnly
                  ? "bg-accent border-accent"
                  : "bg-tf-elevated border-tf-border-strong"
              }`}
            >
              {filters.billableOnly && (
                <Ionicons name="checkmark" size={14} color="#0a0e1a" />
              )}
            </View>
            <Text className="text-txt-secondary text-sm">Billable only</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};
