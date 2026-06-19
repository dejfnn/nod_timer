import { useRef, useState } from 'react'
import { continueEntry, duplicateEntry, deleteEntry } from '@/db/actions'
import { Icon } from '@/components/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'
import type { Client, Project, Tag, TimeEntry } from '@/types'
import { fmtClock, fmtDuration } from '@/utils/time'

interface EntryRowProps {
  entry: TimeEntry
  projects: Project[]
  clients: Client[]
  tags: Tag[]
  hourFormat: '12' | '24'
  onEdit: (entry: TimeEntry) => void
}

export const EntryRow = ({ entry, projects, clients, tags, hourFormat, onEdit }: EntryRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  const project = entry.projectId ? projects.find((p) => p.id === entry.projectId) : undefined
  const client = project?.clientId ? clients.find((c) => c.id === project.clientId) : undefined
  const entryTags = tags.filter((t) => entry.tagIds.includes(t.id))

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 border-t border-ink-700/60 px-4 py-2.5 transition-colors hover:bg-ink-800/70"
      onClick={() => onEdit(entry)}
    >
      <span
        className="h-7 w-[3px] shrink-0 rounded-full"
        style={{ background: project?.color ?? 'var(--color-ink-600)' }}
      />
      <span className={`min-w-0 truncate text-sm ${entry.description ? 'text-paper-50' : 'text-mist-500 italic'}`}>
        {entry.description || '(no description)'}
      </span>
      {project && (
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-paper-300">
          <span className="size-2 rounded-full" style={{ background: project.color }} />
          {project.name}
          {client && <span className="text-mist-500">· {client.name}</span>}
        </span>
      )}
      {entryTags.length > 0 && (
        <span className="hidden shrink-0 items-center gap-1 lg:flex">
          {entryTags.map((t) => (
            <span key={t.id} className="chip">
              {t.name}
            </span>
          ))}
        </span>
      )}

      <span className="ml-auto flex shrink-0 items-center gap-3">
        {entry.billable && <Icon name="dollar" size={14} className="text-accent-500" />}
        <span className="hidden font-mono text-xs text-mist-500 tabular-nums sm:inline">
          {fmtClock(entry.start, hourFormat)} – {fmtClock(entry.stop, hourFormat)}
        </span>
        <span className="w-20 text-right font-mono text-sm text-paper-50 tabular-nums">
          {fmtDuration(entry.stop - entry.start)}
        </span>

        <button
          className="icon-btn opacity-0 group-hover:opacity-100"
          title="Continue this entry"
          onClick={(e) => {
            e.stopPropagation()
            void continueEntry(entry)
          }}
        >
          <Icon name="play" size={15} />
        </button>

        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            className="icon-btn opacity-0 group-hover:opacity-100"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name="dots" size={15} />
          </button>
          {menuOpen && (
            <div className="menu top-full right-0 mt-1">
              <button className="menu-item" onClick={() => { setMenuOpen(false); onEdit(entry) }}>
                <Icon name="pencil" size={14} /> Edit
              </button>
              <button
                className="menu-item"
                onClick={() => { setMenuOpen(false); void duplicateEntry(entry) }}
              >
                <Icon name="copy" size={14} /> Duplicate
              </button>
              <button
                className="menu-item text-danger-500 hover:text-danger-500"
                onClick={() => { setMenuOpen(false); void deleteEntry(entry.id) }}
              >
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </span>
    </div>
  )
}
