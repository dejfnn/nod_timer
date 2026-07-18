import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'
import type {
  Client,
  PendingInvite,
  Project,
  RunningEntry,
  SavedReport,
  Settings,
  Tag,
  TimeEntry,
  User,
  Workspace,
  WorkspaceMemberInfo,
} from '@/types'

export type AuthResponse = { token: string; user: User }

export const authApi = {
  register: (email: string, password: string) =>
    apiPost<AuthResponse>('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    apiPost<AuthResponse>('/auth/login', { email, password }),
  me: () => apiGet<User>('/auth/me'),
}

export type ClientInput = Omit<Client, 'id'>
export const clientsApi = {
  list: () => apiGet<Client[]>('/api/clients'),
  create: (data: ClientInput) => apiPost<Client>('/api/clients', data),
  update: (id: string, data: Partial<ClientInput>) => apiPatch<Client>(`/api/clients/${id}`, data),
  remove: (id: string) => apiDelete<{ ok: true }>(`/api/clients/${id}`),
}

export type ProjectInput = Omit<Project, 'id'>
export const projectsApi = {
  list: () => apiGet<Project[]>('/api/projects'),
  create: (data: ProjectInput) => apiPost<Project>('/api/projects', data),
  update: (id: string, data: Partial<ProjectInput>) => apiPatch<Project>(`/api/projects/${id}`, data),
  remove: (id: string) => apiDelete<{ ok: true }>(`/api/projects/${id}`),
}

export type TagInput = Omit<Tag, 'id'>
export const tagsApi = {
  list: () => apiGet<Tag[]>('/api/tags'),
  create: (data: TagInput) => apiPost<Tag>('/api/tags', data),
  update: (id: string, data: Partial<TagInput>) => apiPatch<Tag>(`/api/tags/${id}`, data),
  remove: (id: string) => apiDelete<{ ok: true }>(`/api/tags/${id}`),
}

export type EntryInput = Omit<TimeEntry, 'id' | 'userId' | 'invoicedAt'> & {
  invoicedAt?: number | null
}
export interface EntriesQuery {
  from?: number
  to?: number
  limit?: number
  beforeStart?: number
  beforeId?: string
  /** 'mine' (default) or 'all' — whole-workspace entries for reports */
  scope?: 'mine' | 'all'
}
export const entriesApi = {
  list: (params: EntriesQuery = {}) => {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value))
    }
    const suffix = qs.size > 0 ? `?${qs}` : ''
    return apiGet<TimeEntry[]>(`/api/entries${suffix}`)
  },
  create: (data: EntryInput) => apiPost<TimeEntry>('/api/entries', data),
  update: (id: string, data: Partial<EntryInput>) => apiPatch<TimeEntry>(`/api/entries/${id}`, data),
  remove: (id: string) => apiDelete<{ ok: true }>(`/api/entries/${id}`),
  markInvoiced: (ids: string[], invoiced: boolean) =>
    apiPost<{ updated: number }>('/api/entries/mark-invoiced', { ids, invoiced }),
}

export interface PublicReportData {
  name: string
  params: SavedReport['params']
  entries: TimeEntry[]
  projects: Pick<Project, 'id' | 'name' | 'color' | 'clientId' | 'rate'>[]
  clients: Client[]
  tags: Tag[]
  currency: string
  defaultRate: number
}

export const reportsApi = {
  list: () => apiGet<SavedReport[]>('/api/reports'),
  create: (name: string, params: SavedReport['params']) =>
    apiPost<SavedReport>('/api/reports', { name, params }),
  remove: (id: string) => apiDelete<{ ok: true }>(`/api/reports/${id}`),
  share: (id: string) => apiPost<SavedReport>(`/api/reports/${id}/share`),
  unshare: (id: string) => apiDelete<{ ok: true }>(`/api/reports/${id}/share`),
  public: (token: string) => apiGet<PublicReportData>(`/public/reports/${token}`),
}

/** Recent distinct entry for the timer-input autocomplete. */
export interface Suggestion {
  description: string
  projectId: string | null
  tagIds: string[]
  billable: boolean
}
export const suggestApi = {
  list: (q: string) => apiGet<Suggestion[]>(`/api/entries/suggest?q=${encodeURIComponent(q)}`),
}

export type RunningInput = Partial<Omit<RunningEntry, 'id'>>
export const runningApi = {
  get: () => apiGet<RunningEntry | null>('/api/running'),
  start: (data: RunningInput) => apiPost<RunningEntry>('/api/running/start', data),
  update: (data: RunningInput) => apiPatch<RunningEntry>('/api/running', data),
  stop: (stop?: number) => apiPost<TimeEntry>('/api/running/stop', stop === undefined ? {} : { stop }),
  discard: () => apiDelete<{ ok: true }>('/api/running'),
}

export const statsApi = {
  projects: () => apiGet<{ projectId: string; ms: number }[]>('/api/projects/stats'),
  tags: () => apiGet<{ tagId: string; count: number }[]>('/api/tags/stats'),
}

export const settingsApi = {
  get: () => apiGet<Settings>('/api/settings'),
  update: (data: Partial<Settings>) => apiPut<Settings>('/api/settings', data),
}

export const workspacesApi = {
  list: () => apiGet<Workspace[]>('/api/workspaces'),
  create: (name: string) => apiPost<Workspace>('/api/workspaces', { name }),
  rename: (id: string, name: string) => apiPatch<{ ok: true }>(`/api/workspaces/${id}`, { name }),
  members: (id: string) => apiGet<WorkspaceMemberInfo[]>(`/api/workspaces/${id}/members`),
  removeMember: (id: string, userId: string) =>
    apiDelete<{ ok: true }>(`/api/workspaces/${id}/members/${userId}`),
  invite: (id: string, email: string) =>
    apiPost<{ id: string; email: string }>(`/api/workspaces/${id}/invites`, { email }),
  invites: (id: string) =>
    apiGet<{ id: string; email: string }[]>(`/api/workspaces/${id}/invites`),
  revokeInvite: (id: string, inviteId: string) =>
    apiDelete<{ ok: true }>(`/api/workspaces/${id}/invites/${inviteId}`),
}

export const invitesApi = {
  mine: () => apiGet<PendingInvite[]>('/api/invites'),
  accept: (id: string) => apiPost<{ ok: true; workspaceId: string }>(`/api/invites/${id}/accept`),
  decline: (id: string) => apiDelete<{ ok: true }>(`/api/invites/${id}`),
}

export type ExportData = {
  version: number
  exportedAt: string
  clients: Client[]
  projects: Project[]
  tags: Tag[]
  timeEntries: TimeEntry[]
  settings: Settings[]
}
export interface TogglImportResult {
  imported: number
  skippedDuplicates: number
  createdClients: number
  createdProjects: number
  createdTags: number
}
export const dataApi = {
  export: () => apiGet<ExportData>('/api/data/export'),
  import: (data: unknown) => apiPost<{ ok: true }>('/api/data/import', data),
  importToggl: (entries: unknown[]) =>
    apiPost<TogglImportResult>('/api/data/import-toggl', { entries }),
}
