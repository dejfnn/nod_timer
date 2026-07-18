import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { clientsApi, entriesApi, projectsApi, runningApi, statsApi, tagsApi } from '@/api/resources'
import { qk } from '@/lib/queryClient'
import type { TimeEntry } from '@/types'

/**
 * Server-backed read hooks. They return `data | undefined` so components can
 * render a loading state. React Query keeps them fresh (refetch on focus +
 * cache invalidation after mutations).
 */
export const useClients = () => useQuery({ queryKey: qk.clients, queryFn: clientsApi.list }).data
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: projectsApi.list }).data
export const useTags = () => useQuery({ queryKey: qk.tags, queryFn: tagsApi.list }).data

/** Time entries with start in [from, to), newest first. */
export const useEntriesRange = (from: number, to: number, scope: 'mine' | 'all' = 'mine') =>
  useQuery({
    queryKey: qk.entriesRange(from, to, scope),
    queryFn: () => entriesApi.list({ from, to, scope }),
  }).data

export const ENTRIES_PAGE_SIZE = 60

/** Paginated full history for the Timer page, newest first. */
export function useInfiniteEntries() {
  const query = useInfiniteQuery({
    queryKey: qk.entriesInfinite,
    queryFn: ({ pageParam }) => entriesApi.list({ limit: ENTRIES_PAGE_SIZE, ...pageParam }),
    initialPageParam: {} as { beforeStart?: number; beforeId?: string },
    getNextPageParam: (lastPage: TimeEntry[]) => {
      if (lastPage.length < ENTRIES_PAGE_SIZE) return undefined
      const last = lastPage[lastPage.length - 1]
      return { beforeStart: last.start, beforeId: last.id }
    },
  })
  return {
    entries: query.data?.pages.flat(),
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}

/**
 * All-time aggregates, computed server-side. Keyed under the `entries` root so
 * entry mutations refresh them via the existing invalidation.
 */
export const useProjectStats = () =>
  useQuery({ queryKey: [...qk.entries, 'projectStats'], queryFn: statsApi.projects }).data
export const useTagStats = () =>
  useQuery({ queryKey: [...qk.entries, 'tagStats'], queryFn: statsApi.tags }).data

/** The currently running timer, or null when none is running. */
export const useRunning = () => useQuery({ queryKey: qk.running, queryFn: runningApi.get }).data
