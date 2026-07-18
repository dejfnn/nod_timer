import { useEffect, useMemo, useRef, useState } from 'react'
import { useEntriesRange, useProjects } from '@/hooks/queries'
import { createEntry, updateEntry } from '@/db/actions'
import { EditEntryModal } from '@/components/EditEntryModal'
import { Icon } from '@/components/Icon'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/hooks/useSettings'
import type { TimeEntry } from '@/types'
import {
  addDays,
  DAY,
  fmtDuration,
  HOUR,
  MINUTE,
  startOfDay,
  startOfWeek,
} from '@/utils/time'

const HOUR_PX = 52
const SNAP = 15 * MINUTE
const DRAG_THRESHOLD_PX = 5

interface Block {
  entry: TimeEntry
  top: number
  height: number
  lane: number
  lanes: number
}

/** Assign overlapping blocks to side-by-side lanes within one day column. */
function layoutDay(items: { entry: TimeEntry; from: number; to: number }[]): Block[] {
  const sorted = [...items].sort((a, b) => a.from - b.from)
  const laneEnds: number[] = []
  const placed: { item: (typeof sorted)[number]; lane: number; clusterId: number }[] = []
  const clusterLanes: number[] = []
  let clusterId = -1
  let clusterEnd = -1

  for (const item of sorted) {
    if (item.from >= clusterEnd) {
      clusterId++
      clusterLanes[clusterId] = 0
      laneEnds.length = 0
      clusterEnd = item.to
    } else {
      clusterEnd = Math.max(clusterEnd, item.to)
    }
    let lane = laneEnds.findIndex((end) => end <= item.from)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.to)
    } else {
      laneEnds[lane] = item.to
    }
    clusterLanes[clusterId] = Math.max(clusterLanes[clusterId], lane + 1)
    placed.push({ item, lane, clusterId })
  }

  return placed.map(({ item, lane, clusterId: cid }) => ({
    entry: item.entry,
    top: (item.from / HOUR) * HOUR_PX,
    height: Math.max(18, ((item.to - item.from) / HOUR) * HOUR_PX - 2),
    lane,
    lanes: clusterLanes[cid],
  }))
}

/** Snap an absolute timestamp to the 15-minute grid of its local day. */
function snapMs(ms: number): number {
  const day = startOfDay(ms)
  return day + Math.round((ms - day) / SNAP) * SNAP
}

const PREVIEW_ID = '__preview__'

type DragState =
  | { kind: 'create'; anchorMs: number; start: number; stop: number; moved: boolean }
  | {
      kind: 'move'
      entryId: string
      origStart: number
      origStop: number
      grabMs: number
      start: number
      stop: number
      moved: boolean
    }
  | {
      kind: 'resize'
      entryId: string
      edge: 'start' | 'stop'
      origStart: number
      origStop: number
      start: number
      stop: number
      moved: boolean
    }

export const CalendarPage = () => {
  const settings = useSettings()
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{ entry: TimeEntry; isNew: boolean } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const downPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const now = useNow(MINUTE)

  const weekStartTs = addDays(startOfWeek(Date.now(), settings.weekStart), weekOffset * 7)
  const weekEndTs = addDays(weekStartTs, 7)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStartTs, i)),
    [weekStartTs],
  )

  // Fetch one extra day before the week so overnight entries still render.
  const entries = useEntriesRange(weekStartTs - DAY, weekEndTs) ?? []
  const projects = useProjects() ?? []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7.5 * HOUR_PX })
  }, [])

  /** Entries with the in-flight drag applied, so the preview lays out naturally. */
  const displayEntries = useMemo(() => {
    if (!drag) return entries
    if (drag.kind === 'create') {
      const preview: TimeEntry = {
        id: PREVIEW_ID,
        description: '',
        projectId: null,
        tagIds: [],
        billable: false,
        start: drag.start,
        stop: drag.stop,
        invoicedAt: null,
      }
      return [...entries, preview]
    }
    return entries.map((e) =>
      e.id === drag.entryId ? { ...e, start: drag.start, stop: drag.stop } : e,
    )
  }, [entries, drag])

  const blocksByDay = useMemo(
    () =>
      days.map((day) => {
        const dayEnd = addDays(day, 1)
        const items = displayEntries
          .filter((e) => e.stop > day && e.start < dayEnd)
          .map((e) => ({
            entry: e,
            from: Math.max(0, e.start - day),
            to: Math.min(DAY, e.stop - day),
          }))
        return layoutDay(items)
      }),
    [days, displayEntries],
  )

  /** Convert a pointer event into an absolute ms timestamp inside the grid. */
  const pointerToMs = (e: { clientX: number; clientY: number }): number => {
    const rect = gridRef.current!.getBoundingClientRect()
    const colW = (rect.width - 56) / 7
    const dayIdx = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left - 56) / colW)))
    const minutes = Math.min(24 * 60, Math.max(0, ((e.clientY - rect.top) / HOUR_PX) * 60))
    return days[dayIdx] + minutes * MINUTE
  }

  const capture = (e: React.PointerEvent) => {
    gridRef.current?.setPointerCapture(e.pointerId)
    downPos.current = { x: e.clientX, y: e.clientY }
  }

  const startCreate = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    capture(e)
    const ms = pointerToMs(e)
    const day = startOfDay(ms)
    const slot = day + Math.floor((ms - day) / SNAP) * SNAP
    setDrag({ kind: 'create', anchorMs: slot, start: slot, stop: slot + SNAP, moved: false })
  }

  const startMove = (e: React.PointerEvent, entry: TimeEntry) => {
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    setDrag({
      kind: 'move',
      entryId: entry.id,
      origStart: entry.start,
      origStop: entry.stop,
      grabMs: pointerToMs(e),
      start: entry.start,
      stop: entry.stop,
      moved: false,
    })
  }

  const startResize = (e: React.PointerEvent, entry: TimeEntry, edge: 'start' | 'stop') => {
    if (e.button !== 0) return
    e.stopPropagation()
    capture(e)
    setDrag({
      kind: 'resize',
      entryId: entry.id,
      edge,
      origStart: entry.start,
      origStop: entry.stop,
      start: entry.start,
      stop: entry.stop,
      moved: false,
    })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const moved =
      drag.moved ||
      Math.abs(e.clientX - downPos.current.x) + Math.abs(e.clientY - downPos.current.y) >
        DRAG_THRESHOLD_PX
    const ms = pointerToMs(e)

    if (drag.kind === 'create') {
      // stay within the anchor's day column; only the vertical position matters
      const rect = gridRef.current!.getBoundingClientRect()
      const minutes = Math.min(24 * 60, Math.max(0, ((e.clientY - rect.top) / HOUR_PX) * 60))
      const day = startOfDay(drag.anchorMs)
      const edge = day + Math.round((minutes * MINUTE) / SNAP) * SNAP
      setDrag({
        ...drag,
        moved,
        start: Math.min(drag.anchorMs, edge),
        stop: Math.max(drag.anchorMs + SNAP, edge),
      })
    } else if (drag.kind === 'move') {
      const delta = ms - drag.grabMs
      const start = snapMs(drag.origStart + delta)
      setDrag({ ...drag, moved, start, stop: start + (drag.origStop - drag.origStart) })
    } else {
      const point = snapMs(ms)
      if (drag.edge === 'stop') {
        setDrag({ ...drag, moved, stop: Math.max(point, drag.origStart + SNAP) })
      } else {
        setDrag({ ...drag, moved, start: Math.min(point, drag.origStop - SNAP) })
      }
    }
  }

  const onPointerUp = () => {
    if (!drag) return
    setDrag(null)

    if (drag.kind === 'create') {
      void createEntry({
        description: '',
        projectId: null,
        tagIds: [],
        billable: false,
        start: drag.start,
        stop: drag.stop,
      }).then((entry) => setEditing({ entry, isNew: true }))
      return
    }

    const original = entries.find((e) => e.id === drag.entryId)
    if (!original) return

    if (!drag.moved) {
      // plain click: open the editor (resize-handle clicks included)
      setEditing({ entry: original, isNew: false })
      return
    }
    if (drag.start !== drag.origStart || drag.stop !== drag.origStop) {
      void updateEntry(drag.entryId, { start: drag.start, stop: drag.stop })
    }
  }

  const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    addDays(weekStartTs, 3),
  )

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="display text-sm text-paper-50">{monthLabel}</h2>
        <div className="ml-auto flex items-center gap-1">
          <button className="icon-btn" onClick={() => setWeekOffset((w) => w - 1)} title="Previous week">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn-ghost h-8 text-xs" onClick={() => setWeekOffset(0)}>
            Today
          </button>
          <button className="icon-btn" onClick={() => setWeekOffset((w) => w + 1)} title="Next week">
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-ink-700">
          <div />
          {days.map((day) => {
            const isToday = startOfDay(now) === day
            const total = entries
              .filter((e) => e.stop > day && e.start < addDays(day, 1))
              .reduce((sum, e) => sum + Math.min(addDays(day, 1), e.stop) - Math.max(day, e.start), 0)
            return (
              <div key={day} className="border-l border-ink-700/60 px-2 py-2 text-center">
                <div className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${isToday ? 'text-accent-500' : 'text-mist-500'}`}>
                  {new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(day)}
                </div>
                <div className={`font-mono text-sm tabular-nums ${isToday ? 'text-accent-400' : 'text-paper-50'}`}>
                  {new Date(day).getDate()}
                </div>
                <div className="font-mono text-[10px] text-mist-500 tabular-nums">
                  {total > 0 ? fmtDuration(total) : '·'}
                </div>
              </div>
            )
          })}
        </div>

        {/* scrollable grid */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            ref={gridRef}
            className="grid select-none grid-cols-[56px_repeat(7,1fr)]"
            style={{ height: 24 * HOUR_PX }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {/* hour labels */}
            <div className="relative">
              {Array.from({ length: 23 }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-mist-500"
                  style={{ top: (i + 1) * HOUR_PX }}
                >
                  {String(i + 1).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {days.map((day, di) => {
              const isToday = startOfDay(now) === day
              return (
                <div
                  key={day}
                  className="relative border-l border-ink-700/60"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(180deg, transparent 0 ' +
                      (HOUR_PX - 1) +
                      'px, var(--color-ink-700) ' +
                      (HOUR_PX - 1) +
                      'px ' +
                      HOUR_PX +
                      'px)',
                  }}
                  onPointerDown={startCreate}
                >
                  {blocksByDay[di].map((b) => {
                    const project = projects.find((p) => p.id === b.entry.projectId)
                    const color = project?.color ?? 'var(--color-mist-500)'
                    const isDragTarget =
                      b.entry.id === PREVIEW_ID ||
                      (drag !== null && drag.kind !== 'create' && drag.entryId === b.entry.id)
                    const showHandles = !drag && b.entry.id !== PREVIEW_ID && b.height > 26
                    return (
                      <div
                        key={b.entry.id + String(b.top)}
                        className={`absolute cursor-grab overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left transition-[filter] hover:brightness-125 ${
                          isDragTarget ? 'pointer-events-none opacity-80 ring-1 ring-accent-500/60' : ''
                        }`}
                        style={{
                          top: b.top,
                          height: b.height,
                          left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                          width: `calc(${100 / b.lanes}% - 4px)`,
                          background: 'color-mix(in srgb, ' + color + ' 22%, var(--color-ink-800))',
                          borderColor: color,
                        }}
                        onPointerDown={(e) => startMove(e, b.entry)}
                      >
                        <div className="truncate text-[11px] leading-tight text-paper-50">
                          {b.entry.description || '(no description)'}
                        </div>
                        {b.height > 34 && (
                          <div className="truncate font-mono text-[10px] text-mist-300 tabular-nums">
                            {fmtDuration(b.entry.stop - b.entry.start)}
                          </div>
                        )}
                        {showHandles && (
                          <>
                            <div
                              className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                              onPointerDown={(e) => startResize(e, b.entry, 'start')}
                            />
                            <div
                              className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                              onPointerDown={(e) => startResize(e, b.entry, 'stop')}
                            />
                          </>
                        )}
                      </div>
                    )
                  })}

                  {isToday && (
                    <div
                      className="pointer-events-none absolute right-0 left-0 z-10 h-px bg-accent-500"
                      style={{ top: ((now - day) / HOUR) * HOUR_PX }}
                    >
                      <span className="absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-accent-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-mist-500">
        Click or drag on an empty slot to add an entry · drag a block to move it · drag its edge to
        resize.
      </p>

      {editing && (
        <EditEntryModal
          entry={editing.entry}
          deleteOnCancel={editing.isNew}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
