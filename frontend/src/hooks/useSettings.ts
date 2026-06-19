import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/resources'
import { qk } from '@/lib/queryClient'
import { DEFAULT_SETTINGS } from '@/lib/constants'
import type { Settings } from '@/types'

export function useSettings(): Settings {
  return useQuery({ queryKey: qk.settings, queryFn: settingsApi.get }).data ?? DEFAULT_SETTINGS
}
