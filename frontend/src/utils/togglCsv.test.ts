import { describe, expect, it } from 'vitest'
import { parseCsv, parseTogglCsv } from './togglCsv'

const SAMPLE = `User,Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags,Amount ()
David,david@example.com,Acme,Website,,Homepage layout,Yes,2026-07-01,09:00:00,2026-07-01,10:30:00,01:30:00,"design, frontend",750.00
David,david@example.com,,,,Standup,No,2026-07-01,10:30:00,2026-07-01,10:45:00,00:15:00,,
David,david@example.com,Acme,Website,Review,"PR ""big one"", part 2",Yes,2026-07-02,23:30:00,2026-07-03,00:15:00,00:45:00,review,375.00`

describe('parseCsv', () => {
  it('handles quoted cells with commas and escaped quotes', () => {
    const rows = parseCsv('a,"b,c","say ""hi"""\r\nd,e,f')
    expect(rows).toEqual([
      ['a', 'b,c', 'say "hi"'],
      ['d', 'e', 'f'],
    ])
  })
  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n\nc,d\n')).toHaveLength(2)
  })
})

describe('parseTogglCsv', () => {
  const result = parseTogglCsv(SAMPLE)

  it('parses all data rows', () => {
    expect(result.errors).toEqual([])
    expect(result.skipped).toBe(0)
    expect(result.rows).toHaveLength(3)
  })

  it('maps fields', () => {
    const [first] = result.rows
    expect(first.client).toBe('Acme')
    expect(first.project).toBe('Website')
    expect(first.description).toBe('Homepage layout')
    expect(first.billable).toBe(true)
    expect(first.tags).toEqual(['design', 'frontend'])
    expect(first.stop - first.start).toBe(90 * 60_000)
  })

  it('handles empty client/project/tags', () => {
    const second = result.rows[1]
    expect(second.client).toBeNull()
    expect(second.project).toBeNull()
    expect(second.tags).toEqual([])
    expect(second.billable).toBe(false)
  })

  it('merges task into description and supports overnight entries', () => {
    const third = result.rows[2]
    expect(third.description).toBe('Review — PR "big one", part 2')
    expect(third.stop - third.start).toBe(45 * 60_000)
  })

  it('rejects files without Toggl columns', () => {
    const bad = parseTogglCsv('foo,bar\n1,2')
    expect(bad.errors).toHaveLength(1)
    expect(bad.rows).toEqual([])
  })

  it('skips rows with invalid dates', () => {
    const withBad = parseTogglCsv(
      'Start date,Start time,End date,End time\n2026-07-01,09:00:00,2026-07-01,10:00:00\nnot-a-date,x,y,z',
    )
    expect(withBad.rows).toHaveLength(1)
    expect(withBad.skipped).toBe(1)
  })
})
