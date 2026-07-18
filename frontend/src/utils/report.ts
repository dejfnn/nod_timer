import type { Client, Project, Settings, Tag, TimeEntry } from '@/types'
import { PROJECT_COLORS } from '@/utils/colors'
import { amountForMs } from '@/utils/money'
import { fmtDayLabel, roundDurationMs, startOfDay, type RoundingDir } from '@/utils/time'

export type GroupKey = 'project' | 'client' | 'tag' | 'description' | 'day'
export type ReportFilter = 'all' | 'billable' | 'uninvoiced'

export interface ReportParams {
  from: number
  to: number
  groupBy: GroupKey
  rounding: number
  roundingDir: RoundingDir
  filter?: ReportFilter
}

export interface ReportGroupRow {
  id: string
  label: string
  color: string | null
  ms: number
  amount: number
  /** secondary breakdown: description (or project when grouping by description) */
  sub: Map<string, number>
  sortKey: number
}

export type ReportProject = Pick<Project, 'id' | 'name' | 'color' | 'clientId' | 'rate'>
export type ReportSettings = Pick<Settings, 'currency' | 'defaultRate'>

export function filterReportEntries(entries: TimeEntry[], filter: ReportFilter): TimeEntry[] {
  if (filter === 'billable') return entries.filter((e) => e.billable)
  if (filter === 'uninvoiced') return entries.filter((e) => e.billable && e.invoicedAt === null)
  return entries
}

export interface ReportResult {
  rows: ReportGroupRow[]
  totalMs: number
  billableMs: number
  billableAmount: number
}

export function buildReport(
  entries: TimeEntry[],
  params: Pick<ReportParams, 'groupBy' | 'rounding' | 'roundingDir'>,
  projects: ReportProject[],
  clients: Client[],
  tags: Tag[],
  settings: ReportSettings,
): ReportResult {
  const dur = (e: TimeEntry) => roundDurationMs(e.stop - e.start, params.rounding, params.roundingDir)

  const groupsOf = (e: TimeEntry): { id: string; label: string; color: string | null; sortKey: number }[] => {
    switch (params.groupBy) {
      case 'project': {
        const p = projects.find((x) => x.id === e.projectId)
        return [{ id: e.projectId ?? '__none__', label: p?.name ?? 'No project', color: p?.color ?? null, sortKey: 0 }]
      }
      case 'client': {
        const p = projects.find((x) => x.id === e.projectId)
        const cl = clients.find((x) => x.id === p?.clientId)
        return [{ id: cl?.id ?? '__none__', label: cl?.name ?? 'No client', color: null, sortKey: 0 }]
      }
      case 'tag': {
        if (e.tagIds.length === 0)
          return [{ id: '__none__', label: 'No tags', color: null, sortKey: 0 }]
        return e.tagIds.map((id) => ({
          id,
          label: tags.find((t) => t.id === id)?.name ?? '(deleted tag)',
          color: null,
          sortKey: 0,
        }))
      }
      case 'description': {
        const label = e.description || '(no description)'
        return [{ id: label, label, color: null, sortKey: 0 }]
      }
      case 'day': {
        const day = startOfDay(e.start)
        return [{ id: String(day), label: fmtDayLabel(day), color: null, sortKey: day }]
      }
    }
  }

  const map = new Map<string, ReportGroupRow>()
  let totalMs = 0
  let billableMs = 0
  let billableAmount = 0

  for (const e of entries) {
    const ms = dur(e)
    const amount = amountForMs(e, ms, projects, settings)
    totalMs += ms
    if (e.billable) billableMs += ms
    billableAmount += amount

    for (const g of groupsOf(e)) {
      const row = map.get(g.id) ?? { ...g, ms: 0, amount: 0, sub: new Map<string, number>() }
      row.ms += ms
      row.amount += amount
      const subLabel =
        params.groupBy === 'description'
          ? (projects.find((p) => p.id === e.projectId)?.name ?? 'No project')
          : e.description || '(no description)'
      row.sub.set(subLabel, (row.sub.get(subLabel) ?? 0) + ms)
      map.set(g.id, row)
    }
  }

  const rows = [...map.values()]
  if (params.groupBy === 'day') rows.sort((a, b) => a.sortKey - b.sortKey)
  else rows.sort((a, b) => b.ms - a.ms)
  rows.forEach((row, i) => {
    if (!row.color)
      row.color = row.id === '__none__' ? 'var(--color-mist-500)' : (PROJECT_COLORS[i % PROJECT_COLORS.length] ?? null)
  })

  return { rows, totalMs, billableMs, billableAmount }
}
