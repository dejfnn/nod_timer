import { useMemo, useState } from 'react'
import { useClients, useEntriesRange, useProjects, useTags } from '@/hooks/queries'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { Icon } from '@/components/Icon'
import { useSettings } from '@/hooks/useSettings'
import type { Project, TimeEntry } from '@/types'
import { buildCsv, downloadFile } from '@/utils/csv'
import { entryAmount, fmtMoney } from '@/utils/money'
import {
  addDays,
  DAY,
  fmtClock,
  fmtDateShort,
  fmtDuration,
  getRange,
  overlapMs,
  startOfMonth,
  toDateInput,
  type RangeKey,
} from '@/utils/time'

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'year', label: 'This year' },
]

const NO_PROJECT = '__none__'

export const ReportsPage = () => {
  const settings = useSettings()
  const [preset, setPreset] = useState<RangeKey | 'custom'>('week')
  const [customStart, setCustomStart] = useState(toDateInput(addDays(Date.now(), -7)))
  const [customEnd, setCustomEnd] = useState(toDateInput(Date.now()))

  const range = useMemo(() => {
    if (preset !== 'custom') return getRange(preset, settings.weekStart)
    const start = new Date(`${customStart}T00:00`).getTime()
    const end = new Date(`${customEnd}T00:00`).getTime() + DAY
    return { start, end: Math.max(end, start + DAY) }
  }, [preset, customStart, customEnd, settings.weekStart])

  const rangeEntries = useEntriesRange(range.start, range.end)
  const entries = useMemo(
    () => [...(rangeEntries ?? [])].sort((a, b) => a.start - b.start),
    [rangeEntries],
  )
  const projects = useProjects() ?? []
  const clients = useClients() ?? []
  const tags = useTags() ?? []

  const totalMs = entries.reduce((sum, e) => sum + (e.stop - e.start), 0)
  const billableAmount = entries.reduce((sum, e) => sum + entryAmount(e, projects, settings), 0)
  const billableMs = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + (e.stop - e.start), 0)

  // bar chart buckets: daily, or monthly for long ranges
  const chartData = useMemo(() => {
    const days = Math.round((range.end - range.start) / DAY)
    if (days <= 45) {
      const buckets: { label: string; ms: number }[] = []
      for (let d = range.start; d < range.end; d = addDays(d, 1)) {
        const dayEnd = addDays(d, 1)
        const ms = entries.reduce((sum, e) => sum + overlapMs(e.start, e.stop, d, dayEnd), 0)
        buckets.push({ label: fmtDateShort(d), ms })
      }
      return buckets
    }
    const buckets: { label: string; ms: number }[] = []
    let m = startOfMonth(range.start)
    while (m < range.end) {
      const next = startOfMonth(addDays(m, 35))
      const ms = entries.reduce((sum, e) => sum + overlapMs(e.start, e.stop, m, next), 0)
      buckets.push({
        label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(m),
        ms,
      })
      m = next
    }
    return buckets
  }, [entries, range])

  // per-project breakdown
  const byProject = useMemo(() => {
    const map = new Map<string, { project: Project | null; ms: number; amount: number; byDesc: Map<string, number> }>()
    for (const e of entries) {
      const key = e.projectId ?? NO_PROJECT
      const project = projects.find((p) => p.id === e.projectId) ?? null
      const group = map.get(key) ?? { project, ms: 0, amount: 0, byDesc: new Map() }
      group.ms += e.stop - e.start
      group.amount += entryAmount(e, projects, settings)
      const desc = e.description || '(no description)'
      group.byDesc.set(desc, (group.byDesc.get(desc) ?? 0) + (e.stop - e.start))
      map.set(key, group)
    }
    return [...map.values()].sort((a, b) => b.ms - a.ms)
  }, [entries, projects, settings])

  const exportCsv = () => {
    const rows: string[][] = [
      ['Description', 'Project', 'Client', 'Tags', 'Billable', 'Start date', 'Start time', 'End time', 'Duration', 'Amount', 'Currency'],
    ]
    for (const e of entries) {
      const project = projects.find((p) => p.id === e.projectId)
      const client = clients.find((c) => c.id === project?.clientId)
      rows.push([
        e.description,
        project?.name ?? '',
        client?.name ?? '',
        e.tagIds.map((id) => tags.find((t) => t.id === id)?.name ?? '').filter(Boolean).join('; '),
        e.billable ? 'yes' : 'no',
        toDateInput(e.start),
        fmtClock(e.start, '24'),
        fmtClock(e.stop, '24'),
        fmtDuration(e.stop - e.start),
        entryAmount(e, projects, settings).toFixed(2),
        settings.currency,
      ])
    }
    downloadFile(
      `timeflow_${toDateInput(range.start)}_${toDateInput(range.end - 1)}.csv`,
      buildCsv(rows),
      'text/csv;charset=utf-8',
    )
  }

  const fmtEntryCount = (e: TimeEntry[]) => `${e.length} ${e.length === 1 ? 'entry' : 'entries'}`

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPreset(key)}
            className={`btn h-8 px-3 text-xs ${
              preset === key
                ? 'bg-accent-500 font-semibold text-ink-950'
                : 'border border-ink-600 text-paper-300 hover:border-mist-500'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-1 flex items-center gap-1.5">
          <input
            type="date"
            value={customStart}
            onChange={(e) => { setCustomStart(e.target.value); setPreset('custom') }}
            className={`field h-8 px-2 font-mono text-xs ${preset === 'custom' ? 'border-accent-500/70' : ''}`}
          />
          <span className="text-mist-500">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => { setCustomEnd(e.target.value); setPreset('custom') }}
            className={`field h-8 px-2 font-mono text-xs ${preset === 'custom' ? 'border-accent-500/70' : ''}`}
          />
        </div>
        <button className="btn-ghost ml-auto h-8 text-xs" onClick={exportCsv} disabled={entries.length === 0}>
          <Icon name="download" size={14} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total time', value: fmtDuration(totalMs), sub: fmtEntryCount(entries) },
          { label: 'Billable time', value: fmtDuration(billableMs), sub: totalMs > 0 ? `${Math.round((billableMs / totalMs) * 100)} % of total` : '—' },
          { label: 'Billable amount', value: fmtMoney(billableAmount, settings.currency), sub: `rates in ${settings.currency}/h` },
        ].map((card, i) => (
          <div key={card.label} className="card animate-rise px-5 py-4" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="text-[10px] font-semibold tracking-[0.16em] text-mist-500 uppercase">{card.label}</div>
            <div className="mt-1.5 font-mono text-2xl text-paper-50 tabular-nums">{card.value}</div>
            <div className="mt-1 text-xs text-mist-500">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="card animate-rise p-5" style={{ animationDelay: '150ms' }}>
        <BarChart data={chartData} />
      </div>

      <div className="card animate-rise flex gap-8 p-5" style={{ animationDelay: '200ms' }}>
        <DonutChart
          totalMs={totalMs}
          segments={byProject.map((g) => ({
            label: g.project?.name ?? 'No project',
            ms: g.ms,
            color: g.project?.color ?? 'var(--color-mist-500)',
          }))}
        />
        <div className="min-w-0 flex-1 self-center">
          {byProject.length === 0 && (
            <p className="text-sm text-mist-500">Nothing tracked in this range.</p>
          )}
          {byProject.map((g) => (
            <div key={g.project?.id ?? NO_PROJECT} className="flex items-center gap-2.5 border-t border-ink-700/60 py-2 first:border-t-0">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.project?.color ?? 'var(--color-mist-500)' }} />
              <span className="min-w-0 truncate text-sm text-paper-50">{g.project?.name ?? 'No project'}</span>
              <span className="ml-auto font-mono text-xs text-mist-400 tabular-nums">
                {totalMs > 0 ? Math.round((g.ms / totalMs) * 100) : 0} %
              </span>
              <span className="w-20 text-right font-mono text-sm text-paper-50 tabular-nums">{fmtDuration(g.ms)}</span>
              {g.amount > 0 && (
                <span className="w-24 text-right font-mono text-xs text-accent-400 tabular-nums">
                  {fmtMoney(g.amount, settings.currency)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {byProject.length > 0 && (
        <div className="card animate-rise overflow-hidden" style={{ animationDelay: '250ms' }}>
          <div className="display border-b border-ink-700 px-5 py-3 text-[11px] text-mist-300">
            Breakdown
          </div>
          {byProject.map((g) => (
            <div key={g.project?.id ?? NO_PROJECT}>
              <div className="flex items-center gap-2.5 bg-ink-800/50 px-5 py-2.5">
                <span className="size-2.5 rounded-full" style={{ background: g.project?.color ?? 'var(--color-mist-500)' }} />
                <span className="text-sm font-medium text-paper-50">{g.project?.name ?? 'No project'}</span>
                <span className="ml-auto font-mono text-sm text-paper-50 tabular-nums">{fmtDuration(g.ms)}</span>
              </div>
              {[...g.byDesc.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([desc, ms]) => (
                  <div key={desc} className="flex items-center border-t border-ink-700/40 py-2 pr-5 pl-10">
                    <span className={`min-w-0 truncate text-sm ${desc === '(no description)' ? 'text-mist-500 italic' : 'text-paper-300'}`}>
                      {desc}
                    </span>
                    <span className="ml-auto font-mono text-xs text-mist-300 tabular-nums">{fmtDuration(ms)}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
