import { describe, expect, it } from 'vitest'
import {
  addDays,
  DAY,
  fmtDuration,
  fmtHours,
  fromInputs,
  getRange,
  HOUR,
  MINUTE,
  overlapMs,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateInput,
  toTimeInput,
} from './time'

describe('fmtDuration', () => {
  it('formats zero', () => expect(fmtDuration(0)).toBe('0:00:00'))
  it('formats h:mm:ss', () => expect(fmtDuration(HOUR + 5 * MINUTE + 7000)).toBe('1:05:07'))
  it('clamps negative to zero', () => expect(fmtDuration(-5000)).toBe('0:00:00'))
  it('handles >24h', () => expect(fmtDuration(30 * HOUR)).toBe('30:00:00'))
})

describe('fmtHours', () => {
  it('one decimal under 10h', () => expect(fmtHours(90 * MINUTE)).toBe('1.5h'))
  it('rounds above 10h', () => expect(fmtHours(10.4 * HOUR)).toBe('10h'))
})

describe('day boundaries', () => {
  const ts = fromInputs('2026-07-15', '13:45')
  it('startOfDay', () => expect(startOfDay(ts)).toBe(fromInputs('2026-07-15', '00:00')))
  it('addDays crosses month', () =>
    expect(startOfDay(addDays(fromInputs('2026-07-31', '10:00'), 1))).toBe(
      fromInputs('2026-08-01', '00:00'),
    ))
  it('startOfMonth', () => expect(startOfMonth(ts)).toBe(fromInputs('2026-07-01', '00:00')))
})

describe('startOfWeek', () => {
  // 2026-07-15 is a Wednesday
  const wed = fromInputs('2026-07-15', '12:00')
  it('monday start', () => expect(startOfWeek(wed, 1)).toBe(fromInputs('2026-07-13', '00:00')))
  it('sunday start', () => expect(startOfWeek(wed, 0)).toBe(fromInputs('2026-07-12', '00:00')))
  it('is idempotent on the boundary', () => {
    const mon = fromInputs('2026-07-13', '00:00')
    expect(startOfWeek(mon, 1)).toBe(mon)
  })
})

describe('getRange', () => {
  const now = fromInputs('2026-07-15', '12:00')
  it('today spans one day', () => {
    const r = getRange('today', 1, now)
    expect(r.end - r.start).toBe(DAY)
    expect(r.start).toBe(fromInputs('2026-07-15', '00:00'))
  })
  it('week spans 7 days from monday', () => {
    const r = getRange('week', 1, now)
    expect(r.start).toBe(fromInputs('2026-07-13', '00:00'))
    expect(r.end).toBe(fromInputs('2026-07-20', '00:00'))
  })
  it('lastMonth is the previous calendar month', () => {
    const r = getRange('lastMonth', 1, now)
    expect(r.start).toBe(fromInputs('2026-06-01', '00:00'))
    expect(r.end).toBe(fromInputs('2026-07-01', '00:00'))
  })
})

describe('overlapMs', () => {
  it('full containment', () => expect(overlapMs(10, 20, 0, 100)).toBe(10))
  it('partial overlap', () => expect(overlapMs(0, 50, 25, 100)).toBe(25))
  it('no overlap', () => expect(overlapMs(0, 10, 20, 30)).toBe(0))
})

describe('input round-trips', () => {
  it('toDateInput/toTimeInput/fromInputs agree', () => {
    const ts = fromInputs('2026-02-03', '04:05')
    expect(toDateInput(ts)).toBe('2026-02-03')
    expect(toTimeInput(ts)).toBe('04:05')
    expect(fromInputs(toDateInput(ts), toTimeInput(ts))).toBe(ts)
  })
})
