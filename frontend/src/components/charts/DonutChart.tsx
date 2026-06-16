import { fmtDuration } from '@/utils/time'

interface DonutChartProps {
  segments: { label: string; ms: number; color: string }[]
  totalMs: number
}

export const DonutChart = ({ segments, totalMs }: DonutChartProps) => {
  let offset = 0

  return (
    <div className="relative size-44">
      {/* rotated so segments start at 12 o'clock */}
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-ink-700)" strokeWidth="11" />
        {totalMs > 0 &&
          segments.map((s, i) => {
            const pct = (s.ms / totalMs) * 100
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={s.color}
                strokeWidth="11"
                pathLength={100}
                strokeDasharray={`${Math.max(0, pct - 1)} ${100 - Math.max(0, pct - 1)}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${s.label} — ${fmtDuration(s.ms)}`}</title>
              </circle>
            )
            offset += pct
            return el
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base text-paper-50 tabular-nums">{fmtDuration(totalMs)}</span>
        <span className="text-[10px] tracking-[0.14em] text-mist-500 uppercase">total</span>
      </div>
    </div>
  )
}
