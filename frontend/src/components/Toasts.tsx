import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'
import { Icon } from '@/components/Icon'

const KIND_STYLES = {
  error: 'border-danger-500/50 text-danger-500',
  success: 'border-accent-500/50 text-accent-400',
  info: 'border-mist-500/50 text-paper-300',
} as const

export const Toasts = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-ink-850/95 px-4 py-3 shadow-lg backdrop-blur ${KIND_STYLES[t.kind]}`}
        >
          <span className="min-w-0 flex-1 text-sm">{t.message}</span>
          <button className="icon-btn -mt-0.5 -mr-1.5" onClick={() => dismissToast(t.id)}>
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
