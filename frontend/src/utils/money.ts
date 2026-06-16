import type { Project, Settings, TimeEntry } from '@/types'
import { HOUR } from '@/utils/time'

export function entryRate(projectId: string | null, projects: Project[], settings: Settings): number {
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined
  return project?.rate ?? settings.defaultRate
}

export function entryAmount(entry: TimeEntry, projects: Project[], settings: Settings): number {
  if (!entry.billable) return 0
  const rate = entryRate(entry.projectId, projects, settings)
  return ((entry.stop - entry.start) / HOUR) * rate
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
