import { useRef } from 'react'
import { db, DEFAULT_SETTINGS } from '@/db/db'
import { Icon } from '@/components/Icon'
import { useSettings } from '@/hooks/useSettings'
import type { Settings } from '@/types'
import { downloadFile } from '@/utils/csv'
import { toDateInput } from '@/utils/time'

const CURRENCIES = ['CZK', 'EUR', 'USD', 'GBP', 'PLN', 'CHF']

export const SettingsPage = () => {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<Settings>) =>
    void db.settings.put({ ...DEFAULT_SETTINGS, ...settings, ...patch })

  const exportJson = async () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      clients: await db.clients.toArray(),
      projects: await db.projects.toArray(),
      tags: await db.tags.toArray(),
      timeEntries: await db.timeEntries.toArray(),
      settings: await db.settings.toArray(),
    }
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
      await db.transaction(
        'rw',
        [db.clients, db.projects, db.tags, db.timeEntries, db.running, db.settings],
        async () => {
          await Promise.all([
            db.clients.clear(),
            db.projects.clear(),
            db.tags.clear(),
            db.timeEntries.clear(),
            db.running.clear(),
            db.settings.clear(),
          ])
          await db.clients.bulkAdd(data.clients ?? [])
          await db.projects.bulkAdd(data.projects ?? [])
          await db.tags.bulkAdd(data.tags ?? [])
          await db.timeEntries.bulkAdd(data.timeEntries ?? [])
          await db.settings.bulkAdd(data.settings ?? [])
        },
      )
      alert('Import finished.')
    } catch {
      alert('Import failed — not a valid TimeFlow backup file.')
    }
  }

  const wipe = async () => {
    if (!confirm('Delete ALL data? This cannot be undone.')) return
    if (!confirm('Really sure? Consider exporting a backup first.')) return
    await Promise.all([
      db.clients.clear(),
      db.projects.clear(),
      db.tags.clear(),
      db.timeEntries.clear(),
      db.running.clear(),
    ])
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
        </div>
        <p className="mt-3 text-xs text-mist-500">
          The default hourly rate applies to billable entries on projects without their own rate.
        </p>
      </section>

      <section className="card p-5">
        <h3 className="display mb-4 text-[11px] text-mist-300">Data</h3>
        <div className="flex gap-2">
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
        </div>
        <p className="mt-3 text-xs text-mist-500">
          All data lives locally in this browser (IndexedDB). Export a backup before clearing
          browser data or switching machines.
        </p>
      </section>

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
