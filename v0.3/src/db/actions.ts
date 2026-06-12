import { db, uid } from '@/db/db'
import type { RunningEntry, TimeEntry } from '@/types'

export type TimerFields = Pick<
  RunningEntry,
  'description' | 'projectId' | 'tagIds' | 'billable'
>

export async function startTimer(fields: Partial<TimerFields> = {}): Promise<void> {
  await stopTimer()
  await db.running.put({
    id: 'current',
    description: fields.description ?? '',
    projectId: fields.projectId ?? null,
    tagIds: fields.tagIds ?? [],
    billable: fields.billable ?? false,
    start: Date.now(),
  })
}

export async function stopTimer(): Promise<void> {
  const running = await db.running.get('current')
  if (!running) return
  const { id: _id, ...fields } = running
  await db.timeEntries.add({ ...fields, id: uid(), stop: Date.now() })
  await db.running.delete('current')
}

export async function discardTimer(): Promise<void> {
  await db.running.delete('current')
}

export async function continueEntry(entry: TimeEntry): Promise<void> {
  await startTimer(entry)
}

export async function duplicateEntry(entry: TimeEntry): Promise<void> {
  await db.timeEntries.add({ ...entry, id: uid() })
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction('rw', db.projects, db.timeEntries, db.running, async () => {
    await db.projects.delete(projectId)
    await db.timeEntries.where('projectId').equals(projectId).modify({ projectId: null })
    const running = await db.running.get('current')
    if (running?.projectId === projectId) {
      await db.running.update('current', { projectId: null })
    }
  })
}

export async function deleteClient(clientId: string): Promise<void> {
  await db.transaction('rw', db.clients, db.projects, async () => {
    await db.clients.delete(clientId)
    await db.projects.where('clientId').equals(clientId).modify({ clientId: null })
  })
}

export async function deleteTag(tagId: string): Promise<void> {
  await db.transaction('rw', db.tags, db.timeEntries, db.running, async () => {
    await db.tags.delete(tagId)
    await db.timeEntries
      .filter((e) => e.tagIds.includes(tagId))
      .modify((e) => {
        e.tagIds = e.tagIds.filter((t) => t !== tagId)
      })
    const running = await db.running.get('current')
    if (running?.tagIds.includes(tagId)) {
      await db.running.update('current', {
        tagIds: running.tagIds.filter((t) => t !== tagId),
      })
    }
  })
}
