import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useEntriesRange } from '@/hooks/queries'
import { Icon, type IconName } from '@/components/Icon'
import { useSettings } from '@/hooks/useSettings'
import { fmtDuration, getRange } from '@/utils/time'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Timer', icon: 'clock' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/clients', label: 'Clients', icon: 'users' },
  { to: '/tags', label: 'Tags', icon: 'tag' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
]

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const settings = useSettings()
  const { start, end } = getRange('week', settings.weekStart)
  const entries = useEntriesRange(start, end)
  const weekTotal = entries?.reduce((sum, e) => sum + (e.stop - e.start), 0) ?? 0

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-ink-700 bg-ink-950/70">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-accent-500)" strokeWidth="3" />
            <path d="M16 9v7l5 3" fill="none" stroke="var(--color-paper-50)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <div className="display text-sm leading-none text-paper-50">TimeFlow</div>
            <div className="mt-1 text-[10px] tracking-[0.2em] text-mist-500 uppercase">time tracker</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-ink-800 text-paper-50 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent-500'
                  : 'text-mist-400 hover:bg-ink-850 hover:text-paper-300'
              }`
            }
          >
            <Icon name={icon} size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-ink-700 bg-ink-850/60 px-4 py-3">
        <div className="text-[10px] font-semibold tracking-[0.16em] text-mist-500 uppercase">
          This week
        </div>
        <div className="mt-1 font-mono text-lg text-paper-50 tabular-nums">
          {fmtDuration(weekTotal)}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-ink-700/60 px-5 py-3">
        <span className="min-w-0 flex-1 truncate text-xs text-mist-400" title={user?.email}>
          {user?.email}
        </span>
        <button className="icon-btn" onClick={logout} title="Sign out">
          <Icon name="logout" size={15} />
        </button>
      </div>

      <div className="px-5 pb-4 text-[10px] text-mist-500">
        <span className="font-mono">S</span> start/stop · <span className="font-mono">N</span> new
      </div>
    </aside>
  )
}
