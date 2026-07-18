/**
 * Parser for Toggl Track "Detailed report" CSV exports.
 *
 * Expected columns (case-insensitive, order-independent):
 * User, Email, Client, Project, Task, Description, Billable,
 * Start date, Start time, End date, End time, Duration, Tags, Amount
 * Only Start/End date+time are required; everything else is optional.
 */

export interface TogglRow {
  client: string | null
  project: string | null
  description: string
  tags: string[]
  billable: boolean
  start: number
  stop: number
}

export interface TogglParseResult {
  rows: TogglRow[]
  /** number of data lines that could not be parsed */
  skipped: number
  errors: string[]
}

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, newlines in cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const stripBom = (s: string) => s.replace(/^﻿/, '')

export function parseTogglCsv(text: string): TogglParseResult {
  const table = parseCsv(stripBom(text))
  if (table.length < 2) {
    return { rows: [], skipped: 0, errors: ['File has no data rows.'] }
  }

  const header = table[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const idx = {
    client: col('client'),
    project: col('project'),
    task: col('task'),
    description: col('description'),
    billable: col('billable'),
    startDate: col('start date'),
    startTime: col('start time'),
    endDate: col('end date'),
    endTime: col('end time'),
    tags: col('tags'),
  }

  if (idx.startDate === -1 || idx.startTime === -1) {
    return {
      rows: [],
      skipped: 0,
      errors: ['Missing "Start date" / "Start time" columns — is this a Toggl detailed report CSV?'],
    }
  }

  const get = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')

  const rows: TogglRow[] = []
  let skipped = 0
  for (const raw of table.slice(1)) {
    const startDate = get(raw, idx.startDate)
    const startTime = get(raw, idx.startTime)
    const endDate = get(raw, idx.endDate) || startDate
    const endTime = get(raw, idx.endTime)
    const start = new Date(`${startDate}T${startTime}`).getTime()
    const stop = new Date(`${endDate}T${endTime}`).getTime()
    if (Number.isNaN(start) || Number.isNaN(stop) || stop < start) {
      skipped++
      continue
    }

    const task = get(raw, idx.task)
    let description = get(raw, idx.description)
    if (task) description = description ? `${task} — ${description}` : task

    rows.push({
      client: get(raw, idx.client) || null,
      project: get(raw, idx.project) || null,
      description,
      tags: get(raw, idx.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      billable: get(raw, idx.billable).toLowerCase() === 'yes',
      start,
      stop,
    })
  }

  return { rows, skipped, errors: [] }
}
