import { useEffect, useMemo, useRef, useState } from 'react'
import { useEntriesRange, useProjects } from '@/hooks/queries'
import { createEntry } from '@/db/actions'
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

export const CalendarPage = () => {
  const settings = useSettings()
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{ entry: TimeEntry; isNew: boolean } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
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

  const blocksByDay = useMemo(
    () =>
      days.map((day) => {
        const dayEnd = addDays(day, 1)
        const items = entries
          .filter((e) => e.stop > day && e.start < dayEnd)
          .map((e) => ({
            entry: e,
            from: Math.max(0, e.start - day),
            to: Math.min(DAY, e.stop - day),
          }))
        return layoutDay(items)
      }),
    [days, entries],
  )

  const createAt = async (day: number, offsetY: number) => {
    // snap to the 15-minute slot under the cursor
    const quarter = Math.floor(offsetY / (HOUR_PX / 4))
    const start = day + quarter * 15 * MINUTE
    const entry = await createEntry({
      description: '',
      projectId: null,
      tagIds: [],
      billable: false,
      start,
      stop: start + 15 * MINUTE,
    })
    setEditing({ entry, isNew: true })
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
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: 24 * HOUR_PX }}>
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
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    void createAt(day, e.clientY - rect.top)
                  }}
                >
                  {blocksByDay[di].map((b) => {
                    const project = projects.find((p) => p.id === b.entry.projectId)
                    const color = project?.color ?? 'var(--color-mist-500)'
                    return (
                      <button
                        key={b.entry.id + String(b.top)}
                        className="absolute cursor-pointer overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left transition-[filter] hover:brightness-125"
                        style={{
                          top: b.top,
                          height: b.height,
                          left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                          width: `calc(${100 / b.lanes}% - 4px)`,
                          background: 'color-mix(in srgb, ' + color + ' 22%, var(--color-ink-800))',
                          borderColor: color,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing({ entry: b.entry, isNew: false })
                        }}
                      >
                        <div className="truncate text-[11px] leading-tight text-paper-50">
                          {b.entry.description || '(no description)'}
                        </div>
                        {b.height > 34 && (
                          <div className="truncate font-mono text-[10px] text-mist-300 tabular-nums">
                            {fmtDuration(b.entry.stop - b.entry.start)}
                          </div>
                        )}
                      </button>
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
        Click an empty slot to add a 15-minute entry, then adjust its times.
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
