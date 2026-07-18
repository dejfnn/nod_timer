import { useMemo, useState, type ReactNode } from 'react'
import { useClients, useInfiniteEntries, useProjects, useTags } from '@/hooks/queries'
import { continueEntry } from '@/db/actions'
import { EditEntryModal } from '@/components/EditEntryModal'
import { EntryRow } from '@/components/EntryRow'
import { Icon } from '@/components/Icon'
import { useSettings } from '@/hooks/useSettings'
import type { Project, TimeEntry } from '@/types'
import { fmtDayLabel, fmtDuration, startOfDay } from '@/utils/time'

interface StackRowProps {
  entries: TimeEntry[]
  projects: Project[]
  open: boolean
  onToggle: () => void
  children?: ReactNode
}

/** Collapsed group of identical entries within one day. */
const StackRow = ({ entries, projects, open, onToggle, children }: StackRowProps) => {
  const first = entries[0]
  const project = first.projectId ? projects.find((p) => p.id === first.projectId) : undefined
  const total = entries.reduce((sum, e) => sum + (e.stop - e.start), 0)

  return (
    <div className={open ? 'bg-ink-800/40' : ''}>
      <div
        className="group flex cursor-pointer items-center gap-3 border-t border-ink-700/60 px-4 py-2.5 transition-colors hover:bg-ink-800/70"
        onClick={onToggle}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-ink-600 font-mono text-xs text-paper-300 tabular-nums"
          title={open ? 'Collapse' : 'Expand'}
        >
          {entries.length}
        </span>
        <span className={`min-w-0 truncate text-sm ${first.description ? 'text-paper-50' : 'text-mist-500 italic'}`}>
          {first.description || '(no description)'}
        </span>
        {project && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-paper-300">
            <span className="size-2 rounded-full" style={{ background: project.color }} />
            {project.name}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {first.billable && <Icon name="dollar" size={14} className="text-accent-500" />}
          <span className="w-20 text-right font-mono text-sm text-paper-50 tabular-nums">
            {fmtDuration(total)}
          </span>
          <button
            className="icon-btn opacity-0 group-hover:opacity-100"
            title="Continue this entry"
            onClick={(e) => {
              e.stopPropagation()
              void continueEntry(first)
            }}
          >
            <Icon name="play" size={15} />
          </button>
          <Icon
            name={open ? 'chevronLeft' : 'chevronRight'}
            size={14}
            className="rotate-90 text-mist-500"
          />
        </span>
      </div>
      {children}
    </div>
  )
}

/** Entries with identical description/project/tags/billable stack together, like Toggl. */
const stackKey = (e: TimeEntry) =>
  `${e.description}|${e.projectId ?? ''}|${[...e.tagIds].sort().join(',')}|${e.billable}`

export const TimerPage = () => {
  const [editing, setEditing] = useState<TimeEntry | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
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
    return [...map.entries()].map(([day, dayEntries]) => {
      const stacks = new Map<string, TimeEntry[]>()
      for (const e of dayEntries) {
        const key = stackKey(e)
        stacks.set(key, [...(stacks.get(key) ?? []), e])
      }
      return [day, [...stacks.entries()]] as const
    })
  }, [entries])

  const toggleStack = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
        {groups.map(([day, stacks], i) => {
          const total = stacks.reduce(
            (sum, [, es]) => sum + es.reduce((s, e) => s + (e.stop - e.start), 0),
            0,
          )
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
              {stacks.map(([key, stackEntries]) => {
                if (stackEntries.length === 1) {
                  return (
                    <EntryRow
                      key={stackEntries[0].id}
                      entry={stackEntries[0]}
                      projects={projects}
                      clients={clients}
                      tags={tags}
                      hourFormat={settings.hourFormat}
                      onEdit={setEditing}
                    />
                  )
                }
                const stackId = `${day}:${key}`
                const isOpen = expanded.has(stackId)
                return (
                  <StackRow
                    key={stackId}
                    entries={stackEntries}
                    projects={projects}
                    open={isOpen}
                    onToggle={() => toggleStack(stackId)}
                  >
                    {isOpen &&
                      stackEntries.map((entry) => (
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
                  </StackRow>
                )
              })}
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
