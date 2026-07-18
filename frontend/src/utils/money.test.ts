import { describe, expect, it } from 'vitest'
import { entryAmount, entryRate, fmtMoney } from './money'
import { HOUR } from './time'
import type { Project, Settings, TimeEntry } from '@/types'

const settings: Settings = { currency: 'CZK', defaultRate: 500, weekStart: 1, hourFormat: '24' }
const projects: Project[] = [
  { id: 'p1', name: 'A', color: '#fff', clientId: null, rate: 1000, archived: false, estimateHours: null },
  { id: 'p2', name: 'B', color: '#fff', clientId: null, rate: null, archived: false, estimateHours: null },
]

const entry = (over: Partial<TimeEntry>): TimeEntry => ({
  id: 'e',
  description: '',
  projectId: null,
  tagIds: [],
  billable: true,
  start: 0,
  stop: HOUR,
  invoicedAt: null,
  ...over,
})

describe('entryRate', () => {
  it('uses project rate when set', () => expect(entryRate('p1', projects, settings)).toBe(1000))
  it('falls back to default rate', () => expect(entryRate('p2', projects, settings)).toBe(500))
  it('no project falls back to default', () => expect(entryRate(null, projects, settings)).toBe(500))
})

describe('entryAmount', () => {
  it('non-billable is zero', () =>
    expect(entryAmount(entry({ billable: false, projectId: 'p1' }), projects, settings)).toBe(0))
  it('one hour at project rate', () =>
    expect(entryAmount(entry({ projectId: 'p1' }), projects, settings)).toBe(1000))
  it('half hour at default rate', () =>
    expect(entryAmount(entry({ stop: HOUR / 2 }), projects, settings)).toBe(250))
})

describe('fmtMoney', () => {
  it('formats CZK without decimals', () => {
    expect(fmtMoney(1234.5, 'CZK')).toMatch(/1\s?235/)
  })
  it('falls back on unknown currency', () => {
    expect(fmtMoney(10, 'NOPE')).toBe('10 NOPE')
  })
})
