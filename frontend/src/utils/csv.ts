function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadFile(filename: string, content: string, mime: string): void {
  // BOM so Excel opens UTF-8 CSV correctly
  const blob = new Blob(['﻿', content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
