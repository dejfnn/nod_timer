import { useQuery } from '@tanstack/react-query'
import { clientsApi, entriesApi, projectsApi, runningApi, tagsApi } from '@/api/resources'
import { qk } from '@/lib/queryClient'

/**
 * Server-backed read hooks. They return `data | undefined` so they are drop-in
 * replacements for the former Dexie `useLiveQuery(...)` calls. React Query keeps
 * them fresh (refetch on focus + cache invalidation after mutations).
 */
export const useClients = () => useQuery({ queryKey: qk.clients, queryFn: clientsApi.list }).data
export const useProjects = () => useQuery({ queryKey: qk.projects, queryFn: projectsApi.list }).data
export const useTags = () => useQuery({ queryKey: qk.tags, queryFn: tagsApi.list }).data

/** All of the user's time entries (newest first); filter by range in the component. */
export const useEntries = () => useQuery({ queryKey: qk.entries, queryFn: entriesApi.list }).data

/** The currently running timer, or null when none is running. */
export const useRunning = () => useQuery({ queryKey: qk.running, queryFn: runningApi.get }).data
