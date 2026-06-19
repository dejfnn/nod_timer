import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

/** Query keys for all server resources. */
export const qk = {
  clients: ['clients'] as const,
  projects: ['projects'] as const,
  tags: ['tags'] as const,
  entries: ['entries'] as const,
  running: ['running'] as const,
  settings: ['settings'] as const,
}
