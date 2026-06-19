import { useEffect, useRef, useState } from 'react'
import { useRunning } from '@/hooks/queries'
import { createEntry, discardTimer, startTimer, stopTimer, updateRunning } from '@/db/actions'
import { Icon } from '@/components/Icon'
import { ProjectPicker } from '@/components/ProjectPicker'
import { TagPicker } from '@/components/TagPicker'
import { useNow } from '@/hooks/useNow'
import { DAY, fmtDuration, fromInputs, toDateInput } from '@/utils/time'

export const FOCUS_TIMER_EVENT = 'tf:focus-timer'

export const TimerBar = () => {
  const running = useRunning()
  const now = useNow(running ? 500 : null)

  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [billable, setBillable] = useState(false)
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')
  const [manualDate, setManualDate] = useState(() => toDateInput(Date.now()))
  const [manualStart, setManualStart] = useState('09:00')
  const [manualStop, setManualStop] = useState('10:00')
  const inputRef = useRef<HTMLInputElement>(null)

  const elapsed = running ? now - running.start : 0

  // browser tab shows the running time, like Toggl does
  useEffect(() => {
    document.title = running ? `${fmtDuration(elapsed)} — TimeFlow` : 'TimeFlow'
  }, [running, elapsed])

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

  return (
    <div className="border-b border-ink-700 bg-ink-850/60 backdrop-blur">
      <div className="flex items-center gap-2 px-6 py-3.5">
        {running ? (
          <>
            <input
              value={running.description}
              onChange={(e) => updateRunning({ description: e.target.value })}
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
                onClick={() => void stopTimer()}
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
            <input
              ref={inputRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void (mode === 'timer' ? start() : addManual())
              }}
              placeholder={mode === 'timer' ? 'What are you working on?' : 'What did you work on?'}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mist-500"
            />
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
