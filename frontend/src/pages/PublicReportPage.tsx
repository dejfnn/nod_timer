import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/resources'
import { DonutChart } from '@/components/charts/DonutChart'
import { fmtMoney } from '@/utils/money'
import { buildReport, filterReportEntries } from '@/utils/report'
import { fmtDuration, toDateInput } from '@/utils/time'

/** Read-only shared report at /r/:token — rendered without authentication. */
export const PublicReportPage = () => {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicReport', token],
    queryFn: () => reportsApi.public(token ?? ''),
    enabled: Boolean(token),
    retry: 1,
  })

  const report = useMemo(() => {
    if (!data) return null
    const entries = filterReportEntries(data.entries, data.params.filter ?? 'all')
    return buildReport(entries, data.params, data.projects, data.clients, data.tags, {
      currency: data.currency,
      defaultRate: data.defaultRate,
    })
  }, [data])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-mist-400">…</div>
  }
  if (isError || !data || !report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg text-paper-50">Report not found</p>
        <p className="text-sm text-mist-500">The link may have been revoked.</p>
      </div>
    )
  }

  const { rows, totalMs, billableMs, billableAmount } = report

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-10">
      <header>
        <h1 className="display text-lg text-paper-50">{data.name}</h1>
        <p className="mt-1 text-sm text-mist-400">
          {toDateInput(data.params.from)} – {toDateInput(data.params.to - 1)} · shared via TimeFlow
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total time', value: fmtDuration(totalMs) },
          { label: 'Billable time', value: fmtDuration(billableMs) },
          { label: 'Billable amount', value: fmtMoney(billableAmount, data.currency) },
        ].map((card) => (
          <div key={card.label} className="card px-5 py-4">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-mist-500 uppercase">
              {card.label}
            </div>
            <div className="mt-1.5 font-mono text-2xl text-paper-50 tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="card flex gap-8 p-5">
        <DonutChart
          totalMs={totalMs}
          segments={rows.map((g) => ({
            label: g.label,
            ms: g.ms,
            color: g.color ?? 'var(--color-mist-500)',
          }))}
        />
        <div className="min-w-0 flex-1 self-center">
          {rows.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2.5 border-t border-ink-700/60 py-2 first:border-t-0"
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color ?? undefined }} />
              <span className="min-w-0 truncate text-sm text-paper-50">{g.label}</span>
              <span className="ml-auto font-mono text-xs text-mist-400 tabular-nums">
                {totalMs > 0 ? Math.round((g.ms / totalMs) * 100) : 0} %
              </span>
              <span className="w-20 text-right font-mono text-sm text-paper-50 tabular-nums">
                {fmtDuration(g.ms)}
              </span>
              {g.amount > 0 && (
                <span className="w-24 text-right font-mono text-xs text-accent-400 tabular-nums">
                  {fmtMoney(g.amount, data.currency)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="display border-b border-ink-700 px-5 py-3 text-[11px] text-mist-300">
          Breakdown
        </div>
        {rows.map((g) => (
          <div key={g.id}>
            <div className="flex items-center gap-2.5 bg-ink-800/50 px-5 py-2.5">
              <span className="size-2.5 rounded-full" style={{ background: g.color ?? undefined }} />
              <span className="text-sm font-medium text-paper-50">{g.label}</span>
              <span className="ml-auto font-mono text-sm text-paper-50 tabular-nums">
                {fmtDuration(g.ms)}
              </span>
            </div>
            {[...g.sub.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([label, ms]) => (
                <div key={label} className="flex items-center border-t border-ink-700/40 py-2 pr-5 pl-10">
                  <span className={`min-w-0 truncate text-sm ${label === '(no description)' ? 'text-mist-500 italic' : 'text-paper-300'}`}>
                    {label}
                  </span>
                  <span className="ml-auto font-mono text-xs text-mist-300 tabular-nums">
                    {fmtDuration(ms)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
