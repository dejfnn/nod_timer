import type { Project, Settings, TimeEntry } from '@/types'
import { HOUR } from '@/utils/time'

type RateProject = Pick<Project, 'id' | 'rate'>
type RateSettings = Pick<Settings, 'defaultRate'>

export function entryRate(
  projectId: string | null,
  projects: RateProject[],
  settings: RateSettings,
): number {
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined
  return project?.rate ?? settings.defaultRate
}

/** Billable amount for an arbitrary duration (used with rounded report durations). */
export function amountForMs(
  entry: Pick<TimeEntry, 'billable' | 'projectId'>,
  ms: number,
  projects: RateProject[],
  settings: RateSettings,
): number {
  if (!entry.billable) return 0
  return (ms / HOUR) * entryRate(entry.projectId, projects, settings)
}

export function entryAmount(entry: TimeEntry, projects: RateProject[], settings: RateSettings): number {
  return amountForMs(entry, entry.stop - entry.start, projects, settings)
}

export function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ${currency}`
  }
}
