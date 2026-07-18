export interface Client {
  id: string
  name: string
}

export interface Project {
  id: string
  name: string
  color: string
  clientId: string | null
  /** hourly rate; null = use default rate from settings */
  rate: number | null
  archived: boolean
  /** time estimate in hours; null = no estimate */
  estimateHours: number | null
}

export interface Tag {
  id: string
  name: string
}

export interface TimeEntry {
  id: string
  /** the workspace member who tracked this entry */
  userId: string
  description: string
  projectId: string | null
  tagIds: string[]
  billable: boolean
  start: number
  stop: number
  /** ms timestamp when marked invoiced; null = not invoiced */
  invoicedAt: number | null
}

/** The single currently-running timer, kept out of timeEntries until stopped. */
export interface RunningEntry {
  id: string
  description: string
  projectId: string | null
  tagIds: string[]
  billable: boolean
  start: number
}

export interface Settings {
  currency: string
  defaultRate: number
  weekStart: 0 | 1
  hourFormat: '12' | '24'
  /** focus reminder: notify after N minutes of continuous tracking; 0 = off */
  pomodoroMinutes: number
}

export interface User {
  id: string
  email: string
}

export interface Workspace {
  id: string
  name: string
  role: 'owner' | 'member'
  memberCount: number
}

export interface WorkspaceMemberInfo {
  userId: string
  email: string
  role: 'owner' | 'member'
}

export interface PendingInvite {
  id: string
  workspaceId: string
  workspaceName: string
}

export interface SavedReport {
  id: string
  name: string
  params: {
    from: number
    to: number
    groupBy: 'project' | 'client' | 'tag' | 'description' | 'day' | 'member'
    rounding: number
    roundingDir: 'nearest' | 'up' | 'down'
    filter?: 'all' | 'billable' | 'uninvoiced'
  }
  shareToken: string | null
}
