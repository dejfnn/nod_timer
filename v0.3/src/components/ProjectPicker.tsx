import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '@/db/db'
import { Icon } from '@/components/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'
import { randomProjectColor } from '@/utils/colors'

interface ProjectPickerProps {
  value: string | null
  onChange: (projectId: string | null) => void
  /** compact = chip-style trigger used in the timer bar */
  compact?: boolean
}

export const ProjectPicker = ({ value, onChange, compact = false }: ProjectPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const clients = useLiveQuery(() => db.clients.toArray(), []) ?? []

  const selected = projects.find((p) => p.id === value) ?? null
  const clientName = (clientId: string | null) =>
    clients.find((c) => c.id === clientId)?.name ?? null

  const groups = useMemo(() => {
    const visible = projects
      .filter((p) => !p.archived || p.id === value)
      .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
    const map = new Map<string, typeof visible>()
    for (const p of visible) {
      const key = clientName(p.clientId) ?? ''
      map.set(key, [...(map.get(key) ?? []), p])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, clients, query, value])

  const createProject = async () => {
    const name = query.trim()
    if (!name) return
    const id = uid()
    await db.projects.add({
      id,
      name,
      color: randomProjectColor(),
      clientId: null,
      rate: null,
      archived: false,
    })
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  const exactMatch = projects.some((p) => p.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? 'flex h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm transition-colors hover:bg-ink-700'
            : 'field flex w-full cursor-pointer items-center gap-2 text-left'
        }
      >
        {selected ? (
          <>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: selected.color }} />
            <span className="max-w-44 truncate text-paper-50">{selected.name}</span>
          </>
        ) : (
          <>
            <Icon name="folder" size={15} className="text-mist-500" />
            <span className="text-mist-500">Project</span>
          </>
        )}
      </button>

      {open && (
        <div className="menu top-full mt-1.5 w-72">
          <div className="flex items-center gap-2 border-b border-ink-700 px-2.5 py-2">
            <Icon name="search" size={14} className="shrink-0 text-mist-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !exactMatch) void createProject()
              }}
              placeholder="Find or create project…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-mist-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <button className="menu-item" onClick={() => { onChange(null); setOpen(false) }}>
              <span className="size-2.5 rounded-full border border-mist-500" />
              No project
            </button>
            {groups.map(([client, items]) => (
              <div key={client || '—'}>
                {client && (
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-mist-500 uppercase">
                    {client}
                  </div>
                )}
                {items.map((p) => (
                  <button
                    key={p.id}
                    className="menu-item"
                    onClick={() => { onChange(p.id); setOpen(false); setQuery('') }}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                    <span className="truncate">{p.name}</span>
                    {p.archived && <span className="ml-auto text-[10px] text-mist-500">archived</span>}
                    {p.id === value && <Icon name="check" size={14} className="ml-auto text-accent-500" />}
                  </button>
                ))}
              </div>
            ))}
            {query.trim() && !exactMatch && (
              <button className="menu-item text-accent-400" onClick={() => void createProject()}>
                <Icon name="plus" size={14} />
                Create “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
