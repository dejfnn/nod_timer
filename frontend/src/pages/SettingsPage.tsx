import { useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { useSettings } from '@/hooks/useSettings'
import { saveSettings } from '@/db/actions'
import { dataApi } from '@/api/resources'
import { queryClient } from '@/lib/queryClient'
import { DEFAULT_SETTINGS } from '@/lib/constants'
import { showToast } from '@/lib/toast'
import type { Settings } from '@/types'
import { downloadFile } from '@/utils/csv'
import { parseTogglCsv, type TogglParseResult } from '@/utils/togglCsv'
import { toDateInput } from '@/utils/time'

const CURRENCIES = ['CZK', 'EUR', 'USD', 'GBP', 'PLN', 'CHF']

export const SettingsPage = () => {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const togglFileRef = useRef<HTMLInputElement>(null)
  const [togglPreview, setTogglPreview] = useState<TogglParseResult | null>(null)
  const [togglBusy, setTogglBusy] = useState(false)

  const update = (patch: Partial<Settings>) =>
    void saveSettings({ ...DEFAULT_SETTINGS, ...settings, ...patch })

  const exportJson = async () => {
    const data = await dataApi.export()
    downloadFile(
      `timeflow_backup_${toDateInput(Date.now())}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.timeEntries)) throw new Error('invalid file')
      if (!confirm('Importing replaces ALL current data. Continue?')) return
      await dataApi.import(data)
      await queryClient.invalidateQueries()
      alert('Import finished.')
    } catch {
      alert('Import failed — not a valid TimeFlow backup file.')
    }
  }

  const pickTogglFile = async (file: File) => {
    const result = parseTogglCsv(await file.text())
    if (result.errors.length > 0) {
      showToast(result.errors[0])
      return
    }
    if (result.rows.length === 0) {
      showToast('No usable entries found in the file.')
      return
    }
    setTogglPreview(result)
  }

  const runTogglImport = async () => {
    if (!togglPreview) return
    setTogglBusy(true)
    try {
      const result = await dataApi.importToggl(togglPreview.rows)
      await queryClient.invalidateQueries()
      setTogglPreview(null)
      showToast(
        `Imported ${result.imported} entries` +
          (result.skippedDuplicates > 0 ? ` (${result.skippedDuplicates} duplicates skipped)` : ''),
        'success',
      )
    } finally {
      setTogglBusy(false)
    }
  }

  const wipe = async () => {
    if (!confirm('Delete ALL data? This cannot be undone.')) return
    if (!confirm('Really sure? Consider exporting a backup first.')) return
    await dataApi.import({
      version: 1,
      exportedAt: new Date().toISOString(),
      clients: [],
      projects: [],
      tags: [],
      timeEntries: [],
      settings: [],
    })
    await queryClient.invalidateQueries()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-6 py-6">
      <h2 className="display text-sm text-paper-50">Settings</h2>

      <section className="card p-5">
        <h3 className="display mb-4 text-[11px] text-mist-300">Preferences</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Currency</label>
            <select
              value={settings.currency}
              onChange={(e) => update({ currency: e.target.value })}
              className="field w-full"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Default hourly rate</label>
            <input
              type="number"
              min="0"
              value={settings.defaultRate}
              onChange={(e) => update({ defaultRate: Number(e.target.value) || 0 })}
              className="field w-full font-mono"
            />
          </div>
          <div>
            <label className="label">Week starts on</label>
            <select
              value={settings.weekStart}
              onChange={(e) => update({ weekStart: Number(e.target.value) as 0 | 1 })}
              className="field w-full"
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
          <div>
            <label className="label">Time format</label>
            <select
              value={settings.hourFormat}
              onChange={(e) => update({ hourFormat: e.target.value as '12' | '24' })}
              className="field w-full"
            >
              <option value="24">24-hour</option>
              <option value="12">12-hour</option>
            </select>
          </div>
          <div>
            <label className="label">Focus reminder</label>
            <select
              value={settings.pomodoroMinutes}
              onChange={(e) => {
                const minutes = Number(e.target.value)
                if (minutes > 0 && 'Notification' in window && Notification.permission === 'default') {
                  void Notification.requestPermission()
                }
                update({ pomodoroMinutes: minutes })
              }}
              className="field w-full"
            >
              <option value={0}>Off</option>
              <option value={25}>After 25 min (Pomodoro)</option>
              <option value={45}>After 45 min</option>
              <option value={60}>After 1 hour</option>
              <option value={90}>After 90 min</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-mist-500">
          The default hourly rate applies to billable entries on projects without their own rate.
        </p>
      </section>

      <section className="card p-5">
        <h3 className="display mb-4 text-[11px] text-mist-300">Data</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => void exportJson()}>
            <Icon name="download" size={15} />
            Export backup (JSON)
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} />
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importJson(file)
              e.target.value = ''
            }}
          />
          <button className="btn-ghost" onClick={() => togglFileRef.current?.click()}>
            <Icon name="upload" size={15} />
            Import from Toggl (CSV)
          </button>
          <input
            ref={togglFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void pickTogglFile(file)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-3 text-xs text-mist-500">
          Your data is stored on the TimeFlow server under your account. JSON backup import
          replaces all current data. Toggl import merges: it creates missing clients, projects and
          tags by name and skips entries you already have. Use Toggl&apos;s Reports → Detailed →
          Export → CSV.
        </p>
      </section>

      {togglPreview && (
        <Modal title="Import from Toggl" onClose={() => setTogglPreview(null)}>
          <div className="space-y-3 text-sm text-paper-300">
            <p>
              <span className="font-mono text-paper-50">{togglPreview.rows.length}</span> time
              entries found
              {togglPreview.skipped > 0 && (
                <span className="text-mist-500"> · {togglPreview.skipped} rows skipped (invalid)</span>
              )}
            </p>
            <p className="text-xs text-mist-500">
              Range: {toDateInput(Math.min(...togglPreview.rows.map((r) => r.start)))} –{' '}
              {toDateInput(Math.max(...togglPreview.rows.map((r) => r.stop)))} ·{' '}
              {new Set(togglPreview.rows.map((r) => r.project).filter(Boolean)).size} projects ·{' '}
              {new Set(togglPreview.rows.map((r) => r.client).filter(Boolean)).size} clients ·{' '}
              {new Set(togglPreview.rows.flatMap((r) => r.tags)).size} tags
            </p>
            <p className="text-xs text-mist-500">
              Existing entries with the same time and description are skipped, so it is safe to
              re-import the same file.
            </p>
            <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
              <button className="btn-ghost" onClick={() => setTogglPreview(null)} disabled={togglBusy}>
                Cancel
              </button>
              <button className="btn-accent" onClick={() => void runTogglImport()} disabled={togglBusy}>
                {togglBusy ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <section className="card border-danger-500/30 p-5">
        <h3 className="display mb-4 text-[11px] text-danger-500">Danger zone</h3>
        <button className="btn-danger" onClick={() => void wipe()}>
          <Icon name="trash" size={15} />
          Delete all data
        </button>
      </section>
    </div>
  )
}
