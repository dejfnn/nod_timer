import { useState } from 'react'
import { useClients, useProjects } from '@/hooks/queries'
import { createClient, updateClient, deleteClient } from '@/db/actions'
import { Icon } from '@/components/Icon'

export const ClientsPage = () => {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const clients = [...(useClients() ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const projects = useProjects() ?? []

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await createClient({ name: trimmed })
    setName('')
  }

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateClient(editingId, { name: editName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="display text-sm text-paper-50">Clients</h2>
        <div className="ml-auto flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            placeholder="New client name…"
            className="field w-56"
          />
          <button className="btn-accent" onClick={() => void add()} disabled={!name.trim()}>
            <Icon name="plus" size={15} />
            Add
          </button>
        </div>
      </div>

      {clients.length === 0 && (
        <div className="card px-6 py-12 text-center text-sm text-mist-400">
          No clients yet. Clients let you group projects and filter reports.
        </div>
      )}

      <div className="card divide-y divide-ink-700/60 overflow-hidden">
        {clients.map((c, i) => {
          const projectCount = projects.filter((p) => p.clientId === c.id).length
          return (
            <div
              key={c.id}
              className="group animate-rise flex items-center gap-3 px-4 py-3"
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            >
              {editingId === c.id ? (
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
                  <span className="text-sm text-paper-50">{c.name}</span>
                  <span className="text-xs text-mist-500">
                    {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                  </span>
                </>
              )}
              <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="icon-btn"
                  title="Rename"
                  onClick={() => {
                    setEditingId(c.id)
                    setEditName(c.name)
                  }}
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  className="icon-btn hover:text-danger-500"
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Delete client “${c.name}”? Its projects will be kept without a client.`)) {
                      void deleteClient(c.id)
                    }
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
