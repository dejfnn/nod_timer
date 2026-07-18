import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { startTimer, stopTimer } from '@/db/actions'
import { qk, queryClient } from '@/lib/queryClient'
import { useAuth } from '@/auth/AuthContext'
import { Sidebar } from '@/components/Sidebar'
import { TimerBar, FOCUS_TIMER_EVENT } from '@/components/TimerBar'
import { Toasts } from '@/components/Toasts'
import { AuthPage } from '@/pages/AuthPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { PublicReportPage } from '@/pages/PublicReportPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TagsPage } from '@/pages/TagsPage'
import { TimerPage } from '@/pages/TimerPage'
import type { RunningEntry } from '@/types'

const useGlobalShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        const running = queryClient.getQueryData<RunningEntry | null>(qk.running)
        void (running ? stopTimer() : startTimer())
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent(FOCUS_TIMER_EVENT))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}

/** The authenticated application shell (sidebar + timer bar + pages). */
const Shell = () => {
  const { user, loading } = useAuth()
  useGlobalShortcuts()

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-mist-400">…</div>
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="print-hide contents">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="print-hide">
          <TimerBar />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<TimerPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<TimerPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/r/:token" element={<PublicReportPage />} />
      <Route path="*" element={<Shell />} />
    </Routes>
    <Toasts />
  </BrowserRouter>
)
