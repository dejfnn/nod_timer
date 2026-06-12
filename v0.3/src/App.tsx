import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { db } from '@/db/db'
import { startTimer, stopTimer } from '@/db/actions'
import { Sidebar } from '@/components/Sidebar'
import { TimerBar, FOCUS_TIMER_EVENT } from '@/components/TimerBar'
import { CalendarPage } from '@/pages/CalendarPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TagsPage } from '@/pages/TagsPage'
import { TimerPage } from '@/pages/TimerPage'

const useGlobalShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        void db.running.get('current').then((running) => (running ? stopTimer() : startTimer()))
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

export const App = () => {
  useGlobalShortcuts()

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TimerBar />
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
    </BrowserRouter>
  )
}
