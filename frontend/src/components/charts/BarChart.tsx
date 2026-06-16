import { fmtDuration, fmtHours, HOUR } from '@/utils/time'

interface BarChartProps {
  data: { label: string; ms: number }[]
  height?: number
}

export const BarChart = ({ data, height = 180 }: BarChartProps) => {
  const max = Math.max(HOUR, ...data.map((d) => d.ms))
  const showEveryNth = Math.ceil(data.length / 16)

  return (
    <div className="flex w-full items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.round((d.ms / max) * (height - 36))
        return (
          <div key={i} className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch">
            <div className="mb-1 font-mono text-[10px] text-paper-300 opacity-0 transition-opacity group-hover:opacity-100">
              {d.ms > 0 ? fmtDuration(d.ms) : ''}
            </div>
            <div
              className="w-full max-w-7 rounded-t-[3px] transition-colors"
              style={{
                height: Math.max(d.ms > 0 ? 3 : 1, h),
                background: d.ms > 0 ? 'var(--color-accent-500)' : 'var(--color-ink-700)',
              }}
              title={`${d.label} — ${fmtHours(d.ms)}`}
            />
            <div className="mt-1.5 h-3.5 truncate font-mono text-[9px] text-mist-500">
              {i % showEveryNth === 0 ? d.label : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
