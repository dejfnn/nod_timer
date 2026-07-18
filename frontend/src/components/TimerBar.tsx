import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { suggestApi, type Suggestion } from '@/api/resources'
import { useClients, useProjects, useRunning, useTags } from '@/hooks/queries'
import {
  createEntry,
  createProject,
  createTag,
  discardTimer,
  startTimer,
  stopTimer,
  updateRunning,
} from '@/db/actions'
import { Icon } from '@/components/Icon'
import { ProjectPicker } from '@/components/ProjectPicker'
import { TagPicker } from '@/components/TagPicker'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useNow } from '@/hooks/useNow'
import { useSettings } from '@/hooks/useSettings'
import { randomProjectColor } from '@/utils/colors'
import { DAY, fmtDuration, fromInputs, MINUTE, toDateInput } from '@/utils/time'

export const FOCUS_TIMER_EVENT = 'tf:focus-timer'

/** Trailing `@project` / `#tag` token being typed (project/tag names may contain spaces). */
const TOKEN_RE = /(^|\s)([@#])([^@#]*)$/

type DropdownMode = 'suggest' | 'project' | 'tag'

export const TimerBar = () => {
  const running = useRunning()
  const now = useNow(running ? 500 : null)

  const projects = useProjects() ?? []
  const clients = useClients() ?? []
  const tags = useTags() ?? []

  // Local copy of the running description so typing stays smooth; changes are
  // PATCHed after a short pause instead of on every keystroke.
  const [runningDesc, setRunningDesc] = useState<string | null>(null)
  const descTimeout = useRef<number | undefined>(undefined)
  // Keyed by id AND start: replacing the timer (continue) reuses the same row.
  const runningKey = running ? `${running.id}:${running.start}` : null
  useEffect(() => {
    setRunningDesc(null)
    window.clearTimeout(descTimeout.current)
  }, [runningKey])

  const onRunningDescChange = (value: string) => {
    setRunningDesc(value)
    window.clearTimeout(descTimeout.current)
    descTimeout.current = window.setTimeout(() => {
      void updateRunning({ description: value })
    }, 400)
  }

  const flushRunningDesc = async () => {
    window.clearTimeout(descTimeout.current)
    if (runningDesc !== null && runningDesc !== running?.description) {
      await updateRunning({ description: runningDesc })
    }
  }

  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [billable, setBillable] = useState(false)
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')
  const [manualDate, setManualDate] = useState(() => toDateInput(Date.now()))
  const [manualStart, setManualStart] = useState('09:00')
  const [manualStop, setManualStop] = useState('10:00')
  const inputRef = useRef<HTMLInputElement>(null)

  // ---- autocomplete dropdown ----------------------------------------------
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  useClickOutside(dropdownRef, () => setDismissed(true), focused && !dismissed)

  const token = description.match(TOKEN_RE)
  const dropdownMode: DropdownMode = token ? (token[2] === '@' ? 'project' : 'tag') : 'suggest'
  const tokenQuery = token ? token[3].trim().toLowerCase() : ''

  const suggestQ = useDebouncedValue(description.trim(), 150)
  const suggestions =
    useQuery({
      queryKey: ['entries', 'suggestions', suggestQ],
      queryFn: () => suggestApi.list(suggestQ),
      enabled: focused && !dismissed && dropdownMode === 'suggest' && suggestQ.length > 0,
    }).data ?? []

  const stripToken = (text: string) => text.replace(TOKEN_RE, '$1').trimEnd()

  const projectItems = useMemo(
    () =>
      projects
        .filter((p) => !p.archived && p.name.toLowerCase().includes(tokenQuery))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8),
    [projects, tokenQuery],
  )
  const tagItems = useMemo(
    () =>
      tags
        .filter((t) => t.name.toLowerCase().includes(tokenQuery) && !tagIds.includes(t.id))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8),
    [tags, tokenQuery, tagIds],
  )

  const canCreateToken =
    tokenQuery.length > 0 &&
    (dropdownMode === 'project'
      ? !projects.some((p) => p.name.toLowerCase() === tokenQuery)
      : !tags.some((t) => t.name.toLowerCase() === tokenQuery))

  const itemCount =
    dropdownMode === 'suggest'
      ? suggestions.length
      : (dropdownMode === 'project' ? projectItems.length : tagItems.length) +
        (canCreateToken ? 1 : 0)

  const dropdownOpen = focused && !dismissed && !running && itemCount > 0 && (token !== null || description.trim().length > 0)

  useEffect(() => setHighlight(0), [description, dropdownMode, itemCount])

  const applySuggestion = (s: Suggestion) => {
    setDescription(s.description)
    setProjectId(s.projectId)
    setTagIds(s.tagIds)
    setBillable(s.billable)
    setDismissed(true)
    inputRef.current?.focus()
  }

  const applyProject = async (id: string | null) => {
    setDescription(stripToken(description))
    setProjectId(id)
    setDismissed(true)
    inputRef.current?.focus()
  }

  const applyTag = (id: string) => {
    setDescription(stripToken(description))
    setTagIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
    setDismissed(true)
    inputRef.current?.focus()
  }

  const createFromToken = async () => {
    const name = token ? token[3].trim() : ''
    if (!name) return
    if (dropdownMode === 'project') {
      const project = await createProject({
        name,
        color: randomProjectColor(),
        clientId: null,
        rate: null,
        archived: false,
        estimateHours: null,
      })
      await applyProject(project.id)
    } else {
      const tag = await createTag({ name })
      applyTag(tag.id)
    }
  }

  const selectHighlighted = async () => {
    if (dropdownMode === 'suggest') {
      const s = suggestions[highlight]
      if (s) applySuggestion(s)
      return
    }
    const items = dropdownMode === 'project' ? projectItems : tagItems
    if (highlight < items.length) {
      if (dropdownMode === 'project') await applyProject(items[highlight].id)
      else applyTag(items[highlight].id)
    } else if (canCreateToken) {
      await createFromToken()
    }
  }

  // -------------------------------------------------------------------------

  const elapsed = running ? now - running.start : 0

  // browser tab shows the running time, like Toggl does
  useEffect(() => {
    document.title = running ? `${fmtDuration(elapsed)} — TimeFlow` : 'TimeFlow'
  }, [running, elapsed])

  // focus reminder: notify once when the timer passes the configured length
  const settings = useSettings()
  const remindedRef = useRef(false)
  useEffect(() => {
    remindedRef.current = false
  }, [runningKey])
  useEffect(() => {
    if (!running || settings.pomodoroMinutes <= 0 || remindedRef.current) return
    if (elapsed < settings.pomodoroMinutes * MINUTE) return
    remindedRef.current = true
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TimeFlow', {
        body: `You've been tracking for ${settings.pomodoroMinutes} minutes — time for a break?`,
        icon: '/icon.svg',
      })
    }
  }, [running, elapsed, settings.pomodoroMinutes])

  useEffect(() => {
    const focus = () => inputRef.current?.focus()
    window.addEventListener(FOCUS_TIMER_EVENT, focus)
    return () => window.removeEventListener(FOCUS_TIMER_EVENT, focus)
  }, [])

  const start = async () => {
    await startTimer({ description: description.trim(), projectId, tagIds, billable })
    setDescription('')
    setProjectId(null)
    setTagIds([])
    setBillable(false)
  }

  const addManual = async () => {
    const start = fromInputs(manualDate, manualStart)
    let stop = fromInputs(manualDate, manualStop)
    if (Number.isNaN(start) || Number.isNaN(stop)) return
    if (stop <= start) stop += DAY
    await createEntry({
      description: description.trim(),
      projectId,
      tagIds,
      billable,
      start,
      stop,
    })
    setDescription('')
  }

  const onIdleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (dropdownOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % itemCount)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + itemCount) % itemCount)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        void selectHighlighted()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setDismissed(true)
        return
      }
    }
    if (e.key === 'Enter') void (mode === 'timer' ? start() : addManual())
  }

  const projectById = (id: string | null) => projects.find((p) => p.id === id)

  return (
    <div className="border-b border-ink-700 bg-ink-850/60 backdrop-blur">
      <div className="flex items-center gap-2 px-6 py-3.5">
        {running ? (
          <>
            <input
              value={runningDesc ?? running.description}
              onChange={(e) => onRunningDescChange(e.target.value)}
              onBlur={() => void flushRunningDesc()}
              placeholder="(no description)"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mist-500"
            />
            <ProjectPicker
              compact
              value={running.projectId}
              onChange={(id) => updateRunning({ projectId: id })}
            />
            <TagPicker value={running.tagIds} onChange={(ids) => updateRunning({ tagIds: ids })} />
            <button
              className={`icon-btn ${running.billable ? 'text-accent-500 hover:text-accent-400' : ''}`}
              onClick={() => updateRunning({ billable: !running.billable })}
              title="Billable"
            >
              <Icon name="dollar" size={16} />
            </button>
            <span className="mx-2 w-28 text-right font-mono text-xl font-medium text-accent-400 tabular-nums">
              {fmtDuration(elapsed)}
            </span>
            <div className="relative">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-500/40" />
              <button
                className="relative flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent-500 text-ink-950 transition-colors hover:bg-accent-400"
                onClick={() => void flushRunningDesc().then(stopTimer)}
                title="Stop timer (S)"
              >
                <Icon name="stop" size={20} />
              </button>
            </div>
            <button
              className="icon-btn"
              onClick={() => void discardTimer()}
              title="Discard running entry"
            >
              <Icon name="x" size={15} />
            </button>
          </>
        ) : (
          <>
            <div className="relative min-w-0 flex-1" ref={dropdownRef}>
              <input
                ref={inputRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDismissed(false)
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={onIdleKeyDown}
                placeholder={
                  mode === 'timer'
                    ? 'What are you working on?  (@project, #tag)'
                    : 'What did you work on?  (@project, #tag)'
                }
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-mist-500"
              />

              {dropdownOpen && (
                <div
                  className="menu top-full left-0 mt-2 max-h-80 w-[26rem] overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                >
                  {dropdownMode === 'suggest' &&
                    suggestions.map((s, i) => {
                      const project = projectById(s.projectId)
                      return (
                        <button
                          key={`${s.description}-${s.projectId ?? ''}`}
                          className={`menu-item w-full ${i === highlight ? 'bg-ink-700/70' : ''}`}
                          onClick={() => applySuggestion(s)}
                          onMouseEnter={() => setHighlight(i)}
                        >
                          <span className="min-w-0 flex-1 truncate text-left">{s.description}</span>
                          {s.billable && (
                            <Icon name="dollar" size={13} className="shrink-0 text-accent-500" />
                          )}
                          {project && (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-paper-300">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: project.color }}
                              />
                              {project.name}
                            </span>
                          )}
                        </button>
                      )
                    })}

                  {dropdownMode === 'project' && (
                    <>
                      {projectItems.map((p, i) => (
                        <button
                          key={p.id}
                          className={`menu-item w-full ${i === highlight ? 'bg-ink-700/70' : ''}`}
                          onClick={() => void applyProject(p.id)}
                          onMouseEnter={() => setHighlight(i)}
                        >
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                          <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                          {p.clientId && (
                            <span className="text-xs text-mist-500">
                              {clients.find((c) => c.id === p.clientId)?.name}
                            </span>
                          )}
                        </button>
                      ))}
                      {canCreateToken && (
                        <button
                          className={`menu-item w-full text-accent-400 ${highlight === projectItems.length ? 'bg-ink-700/70' : ''}`}
                          onClick={() => void createFromToken()}
                          onMouseEnter={() => setHighlight(projectItems.length)}
                        >
                          <Icon name="plus" size={14} />
                          Create project “{token?.[3].trim()}”
                        </button>
                      )}
                    </>
                  )}

                  {dropdownMode === 'tag' && (
                    <>
                      {tagItems.map((t, i) => (
                        <button
                          key={t.id}
                          className={`menu-item w-full ${i === highlight ? 'bg-ink-700/70' : ''}`}
                          onClick={() => applyTag(t.id)}
                          onMouseEnter={() => setHighlight(i)}
                        >
                          <Icon name="tag" size={13} className="text-mist-500" />
                          <span className="min-w-0 flex-1 truncate text-left">{t.name}</span>
                        </button>
                      ))}
                      {canCreateToken && (
                        <button
                          className={`menu-item w-full text-accent-400 ${highlight === tagItems.length ? 'bg-ink-700/70' : ''}`}
                          onClick={() => void createFromToken()}
                          onMouseEnter={() => setHighlight(tagItems.length)}
                        >
                          <Icon name="plus" size={14} />
                          Create tag “{token?.[3].trim()}”
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <ProjectPicker compact value={projectId} onChange={setProjectId} />
            <TagPicker value={tagIds} onChange={setTagIds} />
            <button
              className={`icon-btn ${billable ? 'text-accent-500 hover:text-accent-400' : ''}`}
              onClick={() => setBillable((b) => !b)}
              title="Billable"
            >
              <Icon name="dollar" size={16} />
            </button>

            {mode === 'manual' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="field h-8 px-2 font-mono text-xs"
                />
                <input
                  type="time"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="field h-8 px-2 font-mono text-xs"
                />
                <span className="text-mist-500">–</span>
                <input
                  type="time"
                  value={manualStop}
                  onChange={(e) => setManualStop(e.target.value)}
                  className="field h-8 px-2 font-mono text-xs"
                />
              </div>
            )}

            {mode === 'timer' ? (
              <button
                className="ml-2 flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent-500 text-ink-950 transition-colors hover:bg-accent-400"
                onClick={() => void start()}
                title="Start timer (S)"
              >
                <Icon name="play" size={20} />
              </button>
            ) : (
              <button className="btn-accent ml-2" onClick={() => void addManual()}>
                Add
              </button>
            )}

            <div className="ml-1 flex flex-col gap-0.5">
              <button
                className={`cursor-pointer rounded p-0.5 ${mode === 'timer' ? 'text-accent-500' : 'text-mist-500 hover:text-paper-300'}`}
                onClick={() => setMode('timer')}
                title="Timer mode"
              >
                <Icon name="clock" size={13} />
              </button>
              <button
                className={`cursor-pointer rounded p-0.5 ${mode === 'manual' ? 'text-accent-500' : 'text-mist-500 hover:text-paper-300'}`}
                onClick={() => setMode('manual')}
                title="Manual mode"
              >
                <Icon name="plus" size={13} />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="ticks opacity-60" />
    </div>
  )
}
