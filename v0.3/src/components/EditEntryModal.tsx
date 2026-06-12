import { useState } from 'react'
import { db } from '@/db/db'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { ProjectPicker } from '@/components/ProjectPicker'
import { TagPicker } from '@/components/TagPicker'
import type { TimeEntry } from '@/types'
import { DAY, fmtDuration, fromInputs, toDateInput, toTimeInput } from '@/utils/time'

interface EditEntryModalProps {
  entry: TimeEntry
  onClose: () => void
}

export const EditEntryModal = ({ entry, onClose }: EditEntryModalProps) => {
  const [description, setDescription] = useState(entry.description)
  const [projectId, setProjectId] = useState(entry.projectId)
  const [tagIds, setTagIds] = useState(entry.tagIds)
  const [billable, setBillable] = useState(entry.billable)
  const [date, setDate] = useState(toDateInput(entry.start))
  const [startTime, setStartTime] = useState(toTimeInput(entry.start))
  const [stopTime, setStopTime] = useState(toTimeInput(entry.stop))

  const start = fromInputs(date, startTime)
  let stop = fromInputs(date, stopTime)
  if (!Number.isNaN(start) && !Number.isNaN(stop) && stop <= start) stop += DAY
  const valid = !Number.isNaN(start) && !Number.isNaN(stop)

  const save = async () => {
    if (!valid) return
    await db.timeEntries.update(entry.id, {
      description: description.trim(),
      projectId,
      tagIds,
      billable,
      start,
      stop,
    })
    onClose()
  }

  const remove = async () => {
    await db.timeEntries.delete(entry.id)
    onClose()
  }

  return (
    <Modal title="Edit time entry" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Description</label>
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
            }}
            className="field w-full"
            placeholder="(no description)"
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">Project</label>
            <ProjectPicker value={projectId} onChange={setProjectId} />
          </div>
          <button
            className={`btn-ghost ${billable ? 'border-accent-500/60 text-accent-500' : ''}`}
            onClick={() => setBillable((b) => !b)}
          >
            <Icon name="dollar" size={15} />
            Billable
          </button>
        </div>

        <div>
          <label className="label">Tags</label>
          <div className="field flex w-fit items-center px-1">
            <TagPicker value={tagIds} onChange={setTagIds} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field font-mono text-xs"
            />
          </div>
          <div>
            <label className="label">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="field font-mono text-xs"
            />
          </div>
          <div>
            <label className="label">Stop</label>
            <input
              type="time"
              value={stopTime}
              onChange={(e) => setStopTime(e.target.value)}
              className="field font-mono text-xs"
            />
          </div>
          <div className="ml-auto pb-1.5 font-mono text-lg text-paper-50 tabular-nums">
            {valid ? fmtDuration(stop - start) : '—'}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink-700 pt-4">
          <button className="btn-danger" onClick={() => void remove()}>
            <Icon name="trash" size={15} />
            Delete
          </button>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-accent" onClick={() => void save()} disabled={!valid}>
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
