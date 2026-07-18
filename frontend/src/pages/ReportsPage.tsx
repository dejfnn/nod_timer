import { useMemo, useState } from 'react'
import { useClients, useEntriesRange, useProjects, useTags } from '@/hooks/queries'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { Icon } from '@/components/Icon'
import { useSettings } from '@/hooks/useSettings'
import type { TimeEntry } from '@/types'
import { PROJECT_COLORS } from '@/utils/colors'
import { buildCsv, downloadFile } from '@/utils/csv'
import { amountForMs, fmtMoney } from '@/utils/money'
import {
  addDays,
  DAY,
  fmtClock,
  fmtDateShort,
  fmtDayLabel,
  fmtDuration,
  getRange,
  overlapMs,
  roundDurationMs,
  startOfDay,
  startOfMonth,
  toDateInput,
  type RangeKey,
  type RoundingDir,
} from '@/utils/time'

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'year', label: 'This year' },
]

type GroupKey = 'project' | 'client' | 'tag' | 'description' | 'day'

const GROUPINGS: { key: GroupKey; label: string }[] = [
  { key: 'project', label: 'Project' },
  { key: 'client', label: 'Client' },
  { key: 'tag', label: 'Tag' },
  { key: 'description', label: 'Description' },
  { key: 'day', label: 'Day' },
]

const ROUNDINGS = [0, 5, 6, 10, 15, 30]

interface GroupRow {
  id: string
  label: string
  color: string | null
  ms: number
  amount: number
  /** secondary breakdown: description (or project when grouping by description) */
  sub: Map<string, number>
  sortKey: number
}

export const ReportsPage = () => {
  const settings = useSettings()
  const [preset, setPreset] = useState<RangeKey | 'custom'>('week')
  const [customStart, setCustomStart] = useState(toDateInput(addDays(Date.now(), -7)))
  const [customEnd, setCustomEnd] = useState(toDateInput(Date.now()))
  const [groupBy, setGroupBy] = useState<GroupKey>('project')
  const [rounding, setRounding] = useState(0)
  const [roundingDir, setRoundingDir] = useState<RoundingDir>('nearest')

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

  /** Duration of an entry with the report's rounding applied. */
  const dur = (e: TimeEntry) => roundDurationMs(e.stop - e.start, rounding, roundingDir)

  const totalMs = entries.reduce((sum, e) => sum + dur(e), 0)
  const billableAmount = entries.reduce(
    (sum, e) => sum + amountForMs(e, dur(e), projects, settings),
    0,
  )
  const billableMs = entries.filter((e) => e.billable).reduce((sum, e) => sum + dur(e), 0)

  // bar chart buckets: daily, or monthly for long ranges (actual, un-rounded time)
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

  const groupsOf = (e: TimeEntry): { id: string; label: string; color: string | null; sortKey: number }[] => {
    switch (groupBy) {
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

  const grouped = useMemo(() => {
    const map = new Map<string, GroupRow>()
    for (const e of entries) {
      const ms = dur(e)
      const amount = amountForMs(e, ms, projects, settings)
      for (const g of groupsOf(e)) {
        const row =
          map.get(g.id) ??
          { ...g, ms: 0, amount: 0, sub: new Map<string, number>() }
        row.ms += ms
        row.amount += amount
        const subLabel =
          groupBy === 'description'
            ? (projects.find((p) => p.id === e.projectId)?.name ?? 'No project')
            : e.description || '(no description)'
        row.sub.set(subLabel, (row.sub.get(subLabel) ?? 0) + ms)
        map.set(g.id, row)
      }
    }
    const rows = [...map.values()]
    if (groupBy === 'day') rows.sort((a, b) => a.sortKey - b.sortKey)
    else rows.sort((a, b) => b.ms - a.ms)
    // stable palette colors for groupings without their own color
    rows.forEach((row, i) => {
      if (!row.color) row.color = row.id === '__none__' ? 'var(--color-mist-500)' : PROJECT_COLORS[i % PROJECT_COLORS.length]
    })
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, groupBy, projects, clients, tags, rounding, roundingDir, settings])

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
        fmtDuration(dur(e)),
        amountForMs(e, dur(e), projects, settings).toFixed(2),
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

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-mist-500">Group by</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupKey)}
          className="field h-8 px-2 text-xs"
        >
          {GROUPINGS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
        <span className="ml-3 text-mist-500">Rounding</span>
        <select
          value={rounding}
          onChange={(e) => setRounding(Number(e.target.value))}
          className="field h-8 px-2 text-xs"
        >
          {ROUNDINGS.map((r) => (
            <option key={r} value={r}>
              {r === 0 ? 'Off' : `${r} min`}
            </option>
          ))}
        </select>
        {rounding > 0 && (
          <select
            value={roundingDir}
            onChange={(e) => setRoundingDir(e.target.value as RoundingDir)}
            className="field h-8 px-2 text-xs"
          >
            <option value="nearest">to nearest</option>
            <option value="up">up</option>
            <option value="down">down</option>
          </select>
        )}
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
          segments={grouped.map((g) => ({
            label: g.label,
            ms: g.ms,
            color: g.color ?? 'var(--color-mist-500)',
          }))}
        />
        <div className="min-w-0 flex-1 self-center">
          {grouped.length === 0 && (
            <p className="text-sm text-mist-500">Nothing tracked in this range.</p>
          )}
          {grouped.map((g) => (
            <div key={g.id} className="flex items-center gap-2.5 border-t border-ink-700/60 py-2 first:border-t-0">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color ?? undefined }} />
              <span className="min-w-0 truncate text-sm text-paper-50">{g.label}</span>
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

      {grouped.length > 0 && (
        <div className="card animate-rise overflow-hidden" style={{ animationDelay: '250ms' }}>
          <div className="display border-b border-ink-700 px-5 py-3 text-[11px] text-mist-300">
            Breakdown
          </div>
          {grouped.map((g) => (
            <div key={g.id}>
              <div className="flex items-center gap-2.5 bg-ink-800/50 px-5 py-2.5">
                <span className="size-2.5 rounded-full" style={{ background: g.color ?? undefined }} />
                <span className="text-sm font-medium text-paper-50">{g.label}</span>
                <span className="ml-auto font-mono text-sm text-paper-50 tabular-nums">{fmtDuration(g.ms)}</span>
              </div>
              {[...g.sub.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([label, ms]) => (
                  <div key={label} className="flex items-center border-t border-ink-700/40 py-2 pr-5 pl-10">
                    <span className={`min-w-0 truncate text-sm ${label === '(no description)' ? 'text-mist-500 italic' : 'text-paper-300'}`}>
                      {label}
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
