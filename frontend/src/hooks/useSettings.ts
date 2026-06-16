import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS } from '@/db/db'
import type { Settings } from '@/types'

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('app'), []) ?? DEFAULT_SETTINGS
}
