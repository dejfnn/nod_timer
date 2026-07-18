import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@/index.css'
import { App } from '@/App'
import { AuthProvider } from '@/auth/AuthContext'
import { ApiError } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { showToast } from '@/lib/toast'

// Surface failed mutations fired without an explicit catch (e.g. `void stopTimer()`).
window.addEventListener('unhandledrejection', (e) => {
  const reason: unknown = e.reason
  if (reason instanceof ApiError) {
    showToast(reason.message)
    e.preventDefault()
  } else if (reason instanceof TypeError && /fetch/i.test(reason.message)) {
    showToast('Network error — check your connection')
    e.preventDefault()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
