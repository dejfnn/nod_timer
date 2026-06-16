export const MINUTE = 60_000
export const HOUR = 3_600_000
export const DAY = 86_400_000

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtHours(ms: number): string {
  const h = ms / HOUR
  return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1)}h`
}

export function fmtClock(ts: number, hourFormat: '12' | '24'): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: hourFormat === '24' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: hourFormat === '12',
  }).format(ts)
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + n)
  return d.getTime()
}

export function addMonths(ts: number, n: number): number {
  const d = new Date(ts)
  d.setMonth(d.getMonth() + n)
  return d.getTime()
}

export function startOfWeek(ts: number, weekStart: 0 | 1): number {
  const d = new Date(startOfDay(ts))
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(d.getTime(), -diff)
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function startOfYear(ts: number): number {
  const d = new Date(ts)
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function fmtDayLabel(ts: number): string {
  const today = startOfDay(Date.now())
  const day = startOfDay(ts)
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(new Date(ts).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  }).format(ts)
}

export function fmtDateShort(ts: number): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(ts)
}

/** Local-timezone value for <input type="date"> */
export function toDateInput(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Local-timezone value for <input type="time"> */
export function toTimeInput(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Combine date input + time input values into a local timestamp. */
export function fromInputs(date: string, time: string): number {
  return new Date(`${date}T${time}`).getTime()
}

export type RangeKey = 'today' | 'week' | 'month' | 'lastMonth' | 'year'

export interface DateRange {
  start: number
  /** exclusive */
  end: number
}

export function getRange(key: RangeKey, weekStart: 0 | 1, now = Date.now()): DateRange {
  switch (key) {
    case 'today':
      return { start: startOfDay(now), end: addDays(startOfDay(now), 1) }
    case 'week': {
      const start = startOfWeek(now, weekStart)
      return { start, end: addDays(start, 7) }
    }
    case 'month':
      return { start: startOfMonth(now), end: addMonths(startOfMonth(now), 1) }
    case 'lastMonth': {
      const end = startOfMonth(now)
      return { start: addMonths(end, -1), end }
    }
    case 'year':
      return { start: startOfYear(now), end: startOfYear(addDays(now, 366)) }
  }
}

/** Portion of [start, stop] that falls within a given day, in ms. */
export function overlapMs(start: number, stop: number, rangeStart: number, rangeEnd: number): number {
  return Math.max(0, Math.min(stop, rangeEnd) - Math.max(start, rangeStart))
}
