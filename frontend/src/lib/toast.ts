export interface Toast {
  id: number
  message: string
  kind: 'error' | 'success' | 'info'
}

type Listener = () => void

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<Listener>()

const emit = () => listeners.forEach((fn) => fn())

export function showToast(message: string, kind: Toast['kind'] = 'error'): void {
  const id = nextId++
  toasts = [...toasts, { id, message, kind }]
  emit()
  setTimeout(() => dismissToast(id), 5000)
}

export function dismissToast(id: number): void {
  if (!toasts.some((t) => t.id === id)) return
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getToasts = () => toasts
