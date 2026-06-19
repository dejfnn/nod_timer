import { qk, queryClient } from '@/lib/queryClient'
import {
  clientsApi,
  entriesApi,
  projectsApi,
  runningApi,
  settingsApi,
  tagsApi,
  type ClientInput,
  type EntryInput,
  type ProjectInput,
  type RunningInput,
  type TagInput,
} from '@/api/resources'
import { ApiError } from '@/lib/api'
import type { Client, Project, RunningEntry, Settings, Tag, TimeEntry } from '@/types'

const invalidate = (...keys: ReadonlyArray<readonly string[]>) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

export type TimerFields = Pick<RunningEntry, 'description' | 'projectId' | 'tagIds' | 'billable'>

// ---- Timer ----------------------------------------------------------------

export async function startTimer(fields: Partial<TimerFields> = {}): Promise<void> {
  await runningApi.start({
    description: fields.description ?? '',
    projectId: fields.projectId ?? null,
    tagIds: fields.tagIds ?? [],
    billable: fields.billable ?? false,
    start: Date.now(),
  })
  await invalidate(qk.running)
}

export async function stopTimer(): Promise<void> {
  try {
    await runningApi.stop(Date.now())
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e // no running timer is fine
  }
  await invalidate(qk.running, qk.entries)
}

export async function discardTimer(): Promise<void> {
  await runningApi.discard()
  await invalidate(qk.running)
}

export async function updateRunning(fields: RunningInput): Promise<void> {
  await runningApi.update(fields)
  await invalidate(qk.running)
}

export async function continueEntry(entry: TimeEntry): Promise<void> {
  await startTimer(entry)
}

export async function duplicateEntry(entry: TimeEntry): Promise<void> {
  const { id: _id, ...rest } = entry
  await entriesApi.create(rest)
  await invalidate(qk.entries)
}

// ---- Time entries ---------------------------------------------------------

export async function createEntry(data: EntryInput): Promise<TimeEntry> {
  const entry = await entriesApi.create(data)
  await invalidate(qk.entries)
  return entry
}

export async function updateEntry(id: string, data: Partial<EntryInput>): Promise<void> {
  await entriesApi.update(id, data)
  await invalidate(qk.entries)
}

export async function deleteEntry(id: string): Promise<void> {
  await entriesApi.remove(id)
  await invalidate(qk.entries)
}

// ---- Projects -------------------------------------------------------------

export async function createProject(data: ProjectInput): Promise<Project> {
  const project = await projectsApi.create(data)
  await invalidate(qk.projects)
  return project
}

export async function updateProject(id: string, data: Partial<ProjectInput>): Promise<void> {
  await projectsApi.update(id, data)
  await invalidate(qk.projects)
}

export async function deleteProject(projectId: string): Promise<void> {
  await projectsApi.remove(projectId)
  await invalidate(qk.projects, qk.entries, qk.running)
}

// ---- Clients --------------------------------------------------------------

export async function createClient(data: ClientInput): Promise<Client> {
  const client = await clientsApi.create(data)
  await invalidate(qk.clients)
  return client
}

export async function updateClient(id: string, data: Partial<ClientInput>): Promise<void> {
  await clientsApi.update(id, data)
  await invalidate(qk.clients)
}

export async function deleteClient(clientId: string): Promise<void> {
  await clientsApi.remove(clientId)
  await invalidate(qk.clients, qk.projects)
}

// ---- Tags -----------------------------------------------------------------

export async function createTag(data: TagInput): Promise<Tag> {
  const tag = await tagsApi.create(data)
  await invalidate(qk.tags)
  return tag
}

export async function updateTag(id: string, data: Partial<TagInput>): Promise<void> {
  await tagsApi.update(id, data)
  await invalidate(qk.tags)
}

export async function deleteTag(tagId: string): Promise<void> {
  await tagsApi.remove(tagId)
  await invalidate(qk.tags, qk.entries, qk.running)
}

// ---- Settings -------------------------------------------------------------

export async function saveSettings(data: Partial<Settings>): Promise<void> {
  await settingsApi.update(data)
  await invalidate(qk.settings)
}
