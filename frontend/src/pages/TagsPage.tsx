import { useState } from 'react'
import { useTags, useTagStats } from '@/hooks/queries'
import { createTag, updateTag, deleteTag } from '@/db/actions'
import { Icon } from '@/components/Icon'

export const TagsPage = () => {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const tags = useTags() ?? []
  const tagStats = useTagStats()

  const usage = (tagId: string) => tagStats?.find((s) => s.tagId === tagId)?.count ?? 0

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createTag({ name: trimmed })
    setName('')
  }

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateTag(editingId, { name: editName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="display text-sm text-paper-50">Tags</h2>
        <div className="ml-auto flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            placeholder="New tag name…"
            className="field w-56"
          />
          <button className="btn-accent" onClick={() => void add()} disabled={!name.trim()}>
            <Icon name="plus" size={15} />
            Add
          </button>
        </div>
      </div>

      {tags.length === 0 && (
        <div className="card px-6 py-12 text-center text-sm text-mist-400">
          No tags yet. Tags add a second dimension to entries — e.g. “meeting”, “deep work”.
        </div>
      )}

      <div className="card divide-y divide-ink-700/60 overflow-hidden">
        {tags.map((t, i) => (
          <div
            key={t.id}
            className="group animate-rise flex items-center gap-3 px-4 py-3"
            style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
          >
            <Icon name="tag" size={14} className="text-mist-500" />
            {editingId === t.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveEdit()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={() => void saveEdit()}
                className="field h-8 flex-1"
              />
            ) : (
              <>
                <span className="text-sm text-paper-50">{t.name}</span>
                <span className="text-xs text-mist-500">
                  {usage(t.id)} {usage(t.id) === 1 ? 'entry' : 'entries'}
                </span>
              </>
            )}
            <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                className="icon-btn"
                title="Rename"
                onClick={() => {
                  setEditingId(t.id)
                  setEditName(t.name)
                }}
              >
                <Icon name="pencil" size={15} />
              </button>
              <button
                className="icon-btn hover:text-danger-500"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete tag “${t.name}”? It will be removed from all entries.`)) {
                    void deleteTag(t.id)
                  }
                }}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
