import type { Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  currency: 'CZK',
  defaultRate: 0,
  weekStart: 1,
  hourFormat: '24',
  pomodoroMinutes: 0,
}

export const uid = () => crypto.randomUUID()
