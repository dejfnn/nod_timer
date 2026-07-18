import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { entriesApi, reportsApi, workspacesApi } from '@/api/resources'
import { useWorkspace } from '@/auth/WorkspaceContext'
import { useClients, useEntriesRange, useProjects, useTags } from '@/hooks/queries'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { Icon } from '@/components/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useSettings } from '@/hooks/useSettings'
import { qk, queryClient } from '@/lib/queryClient'
import { showToast } from '@/lib/toast'
import type { SavedReport, TimeEntry } from '@/types'
import { buildCsv, downloadFile } from '@/utils/csv'
import { amountForMs, fmtMoney } from '@/utils/money'
import {
  buildReport,
  filterReportEntries,
  type GroupKey,
  type ReportFilter,
} from '@/utils/report'
import {
  addDays,
  DAY,
  fmtClock,
  fmtDateShort,
  fmtDuration,
  getRange,
  overlapMs,
  roundDurationMs,
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

const GROUPINGS: { key: GroupKey; label: string }[] = [
  { key: 'project', label: 'Project' },
  { key: 'client', label: 'Client' },
  { key: 'tag', label: 'Tag' },
  { key: 'description', label: 'Description' },
  { key: 'day', label: 'Day' },
]

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'all', label: 'All entries' },
  { key: 'billable', label: 'Billable only' },
  { key: 'uninvoiced', label: 'Uninvoiced billable' },
]

const ROUNDINGS = [0, 5, 6, 10, 15, 30]

export const ReportsPage = () => {
  const settings = useSettings()
  const [preset, setPreset] = useState<RangeKey | 'custom'>('week')
  const [customStart, setCustomStart] = useState(toDateInput(addDays(Date.now(), -7)))
  const [customEnd, setCustomEnd] = useState(toDateInput(Date.now()))
  const [groupBy, setGroupBy] = useState<GroupKey>('project')
  const [rounding, setRounding] = useState(0)
  const [roundingDir, setRoundingDir] = useState<RoundingDir>('nearest')
  const [filter, setFilter] = useState<ReportFilter>('all')
  const [savedOpen, setSavedOpen] = useState(false)
  const savedRef = useRef<HTMLDivElement>(null)
  useClickOutside(savedRef, () => setSavedOpen(false), savedOpen)

  const range = useMemo(() => {
    if (preset !== 'custom') return getRange(preset, settings.weekStart)
    const start = new Date(`${customStart}T00:00`).getTime()
    const end = new Date(`${customEnd}T00:00`).getTime() + DAY
    return { start, end: Math.max(end, start + DAY) }
  }, [preset, customStart, customEnd, settings.weekStart])

  // reports cover the whole workspace, not just the signed-in member
  const rangeEntries = useEntriesRange(range.start, range.end, 'all')
  const entries = useMemo(
    () =>
      filterReportEntries(
        [...(rangeEntries ?? [])].sort((a, b) => a.start - b.start),
        filter,
      ),
    [rangeEntries, filter],
  )
  const projects = useProjects() ?? []
  const clients = useClients() ?? []
  const tags = useTags() ?? []

  const { active } = useWorkspace()
  const isTeam = (active?.memberCount ?? 1) > 1
  const members =
    useQuery({
      queryKey: ['workspaces', active?.id, 'members'],
      queryFn: () => workspacesApi.members(active!.id),
      enabled: Boolean(active) && isTeam,
    }).data ?? []

  const savedReports = useQuery({ queryKey: ['reports'], queryFn: reportsApi.list }).data ?? []

  const dur = (e: TimeEntry) => roundDurationMs(e.stop - e.start, rounding, roundingDir)

  const report = useMemo(
    () =>
      buildReport(
        entries,
        { groupBy, rounding, roundingDir },
        projects,
        clients,
        tags,
        settings,
        members.map((m) => ({ id: m.userId, label: m.email })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, groupBy, rounding, roundingDir, projects, clients, tags, settings, members],
  )

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

  const currentParams = (): SavedReport['params'] => ({
    from: range.start,
    to: range.end,
    groupBy,
    rounding,
    roundingDir,
    filter,
  })

  const saveReport = async () => {
    const name = prompt('Report name:')
    if (!name?.trim()) return
    await reportsApi.create(name.trim(), currentParams())
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    showToast('Report saved.', 'success')
  }

  const applySaved = (r: SavedReport) => {
    setPreset('custom')
    setCustomStart(toDateInput(r.params.from))
    setCustomEnd(toDateInput(r.params.to - 1))
    setGroupBy(r.params.groupBy)
    setRounding(r.params.rounding)
    setRoundingDir(r.params.roundingDir)
    setFilter(r.params.filter ?? 'all')
    setSavedOpen(false)
  }

  const shareSaved = async (r: SavedReport) => {
    const updated = r.shareToken ? r : await reportsApi.share(r.id)
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    const url = `${window.location.origin}/r/${updated.shareToken}`
    await navigator.clipboard.writeText(url)
    showToast('Share link copied to clipboard.', 'success')
  }

  const unshareSaved = async (r: SavedReport) => {
    await reportsApi.unshare(r.id)
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
    showToast('Share link revoked.', 'info')
  }

  const deleteSaved = async (r: SavedReport) => {
    if (!confirm(`Delete saved report “${r.name}”?`)) return
    await reportsApi.remove(r.id)
    await queryClient.invalidateQueries({ queryKey: ['reports'] })
  }

  const uninvoiced = entries.filter((e) => e.billable && e.invoicedAt === null)

  const markInvoiced = async () => {
    if (uninvoiced.length === 0) return
    if (!confirm(`Mark ${uninvoiced.length} billable entries in this range as invoiced?`)) return
    await entriesApi.markInvoiced(uninvoiced.map((e) => e.id), true)
    await queryClient.invalidateQueries({ queryKey: qk.entries })
    showToast(`${uninvoiced.length} entries marked as invoiced.`, 'success')
  }

  const exportCsv = () => {
    const rows: string[][] = [
      ['Description', 'Project', 'Client', 'Tags', 'Billable', 'Invoiced', 'Start date', 'Start time', 'End time', 'Duration', 'Amount', 'Currency'],
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
        e.invoicedAt !== null ? 'yes' : 'no',
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
  const { rows: grouped, totalMs, billableMs, billableAmount } = report

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-6">
      <div className="print-hide flex flex-wrap items-center gap-2">
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
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={savedRef}>
            <button className="btn-ghost h-8 text-xs" onClick={() => setSavedOpen((o) => !o)}>
              Saved reports
            </button>
            {savedOpen && (
              <div className="menu top-full right-0 mt-1 w-80">
                {savedReports.length === 0 && (
                  <p className="px-3 py-2 text-xs text-mist-500">No saved reports yet.</p>
                )}
                {savedReports.map((r) => (
                  <div key={r.id} className="flex items-center gap-1">
                    <button className="menu-item min-w-0 flex-1" onClick={() => applySaved(r)}>
                      <span className="truncate">{r.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-mist-500">
                        {toDateInput(r.params.from)}
                      </span>
                    </button>
                    <button
                      className={`icon-btn shrink-0 ${r.shareToken ? 'text-accent-500' : ''}`}
                      title={r.shareToken ? 'Copy share link (already public)' : 'Create share link'}
                      onClick={() => void shareSaved(r)}
                    >
                      <Icon name="upload" size={13} />
                    </button>
                    {r.shareToken && (
                      <button
                        className="icon-btn shrink-0"
                        title="Revoke share link"
                        onClick={() => void unshareSaved(r)}
                      >
                        <Icon name="x" size={13} />
                      </button>
                    )}
                    <button
                      className="icon-btn shrink-0 hover:text-danger-500"
                      title="Delete"
                      onClick={() => void deleteSaved(r)}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn-ghost h-8 text-xs" onClick={() => void saveReport()}>
            Save report
          </button>
          <button className="btn-ghost h-8 text-xs" onClick={() => window.print()}>
            Print / PDF
          </button>
          <button className="btn-ghost h-8 text-xs" onClick={exportCsv} disabled={entries.length === 0}>
            <Icon name="download" size={14} />
            CSV
          </button>
        </div>
      </div>

      <div className="print-hide flex flex-wrap items-center gap-2 text-xs">
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
          {isTeam && <option value="member">Member</option>}
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
        <span className="ml-3 text-mist-500">Show</span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ReportFilter)}
          className="field h-8 px-2 text-xs"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        {uninvoiced.length > 0 && (
          <button className="btn-ghost ml-auto h-8 text-xs" onClick={() => void markInvoiced()}>
            <Icon name="check" size={13} />
            Mark {uninvoiced.length} as invoiced
          </button>
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
