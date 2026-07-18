import { useMemo, useState } from 'react'
import { useClients, useProjects, useProjectStats } from '@/hooks/queries'
import { createProject, updateProject, deleteProject } from '@/db/actions'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { useSettings } from '@/hooks/useSettings'
import type { Project } from '@/types'
import { PROJECT_COLORS } from '@/utils/colors'
import { fmtMoney } from '@/utils/money'
import { fmtDuration } from '@/utils/time'

type Draft = Omit<Project, 'id'> & { id: string | null }

const emptyDraft = (): Draft => ({
  id: null,
  name: '',
  color: PROJECT_COLORS[0],
  clientId: null,
  rate: null,
  archived: false,
})

export const ProjectsPage = () => {
  const settings = useSettings()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const projects = (useProjects() ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
  const clients = (useClients() ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
  const projectStats = useProjectStats()

  const trackedMs = useMemo(
    () => new Map((projectStats ?? []).map((s) => [s.projectId, s.ms])),
    [projectStats],
  )

  const visible = projects.filter((p) => showArchived || !p.archived)
  const archivedCount = projects.filter((p) => p.archived).length

  const save = async () => {
    if (!draft || !draft.name.trim()) return
    const { id, ...fields } = draft
    const data = { ...fields, name: draft.name.trim() }
    if (id) await updateProject(id, data)
    else await createProject(data)
    setDraft(null)
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="display text-sm text-paper-50">Projects</h2>
        {archivedCount > 0 && (
          <button
            className="text-xs text-mist-500 underline-offset-2 hover:underline"
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
          </button>
        )}
        <button className="btn-accent ml-auto" onClick={() => setDraft(emptyDraft())}>
          <Icon name="plus" size={15} />
          New project
        </button>
      </div>

      {visible.length === 0 && (
        <div className="card px-6 py-12 text-center text-sm text-mist-400">
          No projects yet. Create one to organize your time entries.
        </div>
      )}

      <div className="card divide-y divide-ink-700/60 overflow-hidden">
        {visible.map((p, i) => {
          const client = clients.find((c) => c.id === p.clientId)
          return (
            <div
              key={p.id}
              className={`group animate-rise flex items-center gap-3 px-4 py-3 ${p.archived ? 'opacity-50' : ''}`}
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            >
              <span className="size-3 shrink-0 rounded-full" style={{ background: p.color }} />
              <div className="min-w-0">
                <div className="truncate text-sm text-paper-50">
                  {p.name}
                  {p.archived && <span className="ml-2 text-[10px] tracking-wider text-mist-500 uppercase">archived</span>}
                </div>
                {client && <div className="text-xs text-mist-500">{client.name}</div>}
              </div>
              <span className="ml-auto font-mono text-xs text-mist-400 tabular-nums">
                {fmtDuration(trackedMs.get(p.id) ?? 0)}
              </span>
              <span className="w-24 text-right font-mono text-xs text-paper-300 tabular-nums">
                {p.rate !== null ? `${fmtMoney(p.rate, settings.currency)}/h` : '—'}
              </span>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="icon-btn" title="Edit" onClick={() => setDraft({ ...p })}>
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  className="icon-btn"
                  title={p.archived ? 'Unarchive' : 'Archive'}
                  onClick={() => void updateProject(p.id, { archived: !p.archived })}
                >
                  <Icon name="archive" size={15} />
                </button>
                <button
                  className="icon-btn hover:text-danger-500"
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Delete project “${p.name}”? Its time entries will be kept without a project.`)) {
                      void deleteProject(p.id)
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

      {draft && (
        <Modal title={draft.id ? 'Edit project' : 'New project'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save()
                }}
                className="field w-full"
                placeholder="Project name"
              />
            </div>

            <div>
              <label className="label">Color</label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`size-7 cursor-pointer rounded-full transition-transform hover:scale-110 ${
                      draft.color === c ? 'ring-2 ring-paper-50 ring-offset-2 ring-offset-ink-850' : ''
                    }`}
                    style={{ background: c }}
                    onClick={() => setDraft({ ...draft, color: c })}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Client</label>
                <select
                  value={draft.clientId ?? ''}
                  onChange={(e) => setDraft({ ...draft, clientId: e.target.value || null })}
                  className="field w-full"
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-44">
                <label className="label">Hourly rate ({settings.currency})</label>
                <input
                  type="number"
                  min="0"
                  value={draft.rate ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, rate: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  className="field w-full font-mono"
                  placeholder={`default (${settings.defaultRate})`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
              <button className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button className="btn-accent" onClick={() => void save()} disabled={!draft.name.trim()}>
                {draft.id ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
