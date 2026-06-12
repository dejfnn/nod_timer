import Dexie, { type Table } from 'dexie'
import type { Client, Project, RunningEntry, Settings, Tag, TimeEntry } from '@/types'

export class TimeFlowDB extends Dexie {
  clients!: Table<Client, string>
  projects!: Table<Project, string>
  tags!: Table<Tag, string>
  timeEntries!: Table<TimeEntry, string>
  running!: Table<RunningEntry, string>
  settings!: Table<Settings, string>

  constructor() {
    super('timeflow')
    this.version(1).stores({
      clients: 'id, name',
      projects: 'id, name, clientId',
      tags: 'id, name',
      timeEntries: 'id, start, projectId',
      running: 'id',
      settings: 'id',
    })
  }
}

export const db = new TimeFlowDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  currency: 'CZK',
  defaultRate: 0,
  weekStart: 1,
  hourFormat: '24',
}

export const uid = () => crypto.randomUUID()
