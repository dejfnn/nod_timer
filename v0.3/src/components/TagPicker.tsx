import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '@/db/db'
import { Icon } from '@/components/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'

interface TagPickerProps {
  value: string[]
  onChange: (tagIds: string[]) => void
}

export const TagPicker = ({ value, onChange }: TagPickerProps) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  const tags = useLiveQuery(() => db.tags.orderBy('name').toArray(), []) ?? []
  const selected = tags.filter((t) => value.includes(t.id))
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
  const exactMatch = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase())

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const createTag = async () => {
    const name = query.trim()
    if (!name) return
    const id = uid()
    await db.tags.add({ id, name })
    onChange([...value, id])
    setQuery('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors hover:bg-ink-700 ${
          selected.length ? 'text-paper-50' : 'text-mist-500'
        }`}
      >
        <Icon name="tag" size={15} />
        {selected.length === 0 && <span>Tags</span>}
        {selected.length > 0 && (
          <span className="max-w-40 truncate">{selected.map((t) => t.name).join(', ')}</span>
        )}
      </button>

      {open && (
        <div className="menu top-full mt-1.5 w-60">
          <div className="flex items-center gap-2 border-b border-ink-700 px-2.5 py-2">
            <Icon name="search" size={14} className="shrink-0 text-mist-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !exactMatch) void createTag()
              }}
              placeholder="Find or create tag…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-mist-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.map((t) => (
              <button key={t.id} className="menu-item" onClick={() => toggle(t.id)}>
                <span
                  className={`flex size-4 items-center justify-center rounded border ${
                    value.includes(t.id)
                      ? 'border-accent-500 bg-accent-500 text-ink-950'
                      : 'border-ink-600'
                  }`}
                >
                  {value.includes(t.id) && <Icon name="check" size={11} />}
                </span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}
            {filtered.length === 0 && !query.trim() && (
              <div className="px-2.5 py-2 text-xs text-mist-500">No tags yet — type to create one.</div>
            )}
            {query.trim() && !exactMatch && (
              <button className="menu-item text-accent-400" onClick={() => void createTag()}>
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
