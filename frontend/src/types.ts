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
}

export interface Tag {
  id: string
  name: string
}

export interface TimeEntry {
  id: string
  description: string
  projectId: string | null
  tagIds: string[]
  billable: boolean
  start: number
  stop: number
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
}

export interface User {
  id: string
  email: string
}
