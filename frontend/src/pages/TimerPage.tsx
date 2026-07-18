import { useMemo, useState } from 'react'
import { useClients, useInfiniteEntries, useProjects, useTags } from '@/hooks/queries'
import { EditEntryModal } from '@/components/EditEntryModal'
import { EntryRow } from '@/components/EntryRow'
import { useSettings } from '@/hooks/useSettings'
import type { TimeEntry } from '@/types'
import { fmtDayLabel, fmtDuration, startOfDay } from '@/utils/time'

export const TimerPage = () => {
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const settings = useSettings()

  const { entries, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteEntries()
  const projects = useProjects() ?? []
  const clients = useClients() ?? []
  const tags = useTags() ?? []

  const groups = useMemo(() => {
    const map = new Map<number, TimeEntry[]>()
    for (const e of entries ?? []) {
      const day = startOfDay(e.start)
      map.set(day, [...(map.get(day) ?? []), e])
    }
    return [...map.entries()]
  }, [entries])

  if (!entries) return null

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      {groups.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="font-mono text-5xl text-ink-600 tabular-nums select-none">0:00:00</div>
          <p className="mt-4 max-w-sm text-sm text-mist-400">
            No time tracked yet. Type what you're working on above and hit the play button — or
            press <span className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-xs">S</span>.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {groups.map(([day, dayEntries], i) => {
          const total = dayEntries.reduce((sum, e) => sum + (e.stop - e.start), 0)
          return (
            <section
              key={day}
              className="card animate-rise overflow-hidden"
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
            >
              <header className="flex items-baseline justify-between px-4 py-2.5">
                <h3 className="display text-[11px] text-paper-300">{fmtDayLabel(day)}</h3>
                <span className="font-mono text-sm text-mist-300 tabular-nums">
                  {fmtDuration(total)}
                </span>
              </header>
              {dayEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  projects={projects}
                  clients={clients}
                  tags={tags}
                  hourFormat={settings.hourFormat}
                  onEdit={setEditing}
                />
              ))}
            </section>
          )
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center py-6">
          <button
            className="btn-ghost"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {editing && <EditEntryModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
