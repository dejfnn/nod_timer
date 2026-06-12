import { useEffect, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}

export const Modal = ({ title, onClose, children, width = 'max-w-lg' }: ModalProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/70 p-6 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`card w-full ${width} animate-rise shadow-2xl shadow-black/60`}>
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
          <h2 className="display text-xs text-mist-300">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
