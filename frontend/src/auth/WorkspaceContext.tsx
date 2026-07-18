import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workspacesApi } from '@/api/resources'
import { useAuth } from '@/auth/AuthContext'
import { workspaceStore } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import type { Workspace } from '@/types'

type WorkspaceState = {
  workspaces: Workspace[]
  /** the active workspace; null until the list has loaded */
  active: Workspace | null
  setActive: (id: string) => void
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeId, setActiveId] = useState<string | null>(() => workspaceStore.get())

  const workspaces =
    useQuery({
      queryKey: ['workspaces'],
      queryFn: workspacesApi.list,
      enabled: Boolean(user),
    }).data ?? []

  // Drop a stale selection (e.g. after being removed from a workspace).
  useEffect(() => {
    if (workspaces.length > 0 && activeId && !workspaces.some((w) => w.id === activeId)) {
      workspaceStore.clear()
      setActiveId(null)
    }
  }, [workspaces, activeId])

  const active =
    workspaces.find((w) => w.id === activeId) ??
    workspaces.find((w) => w.id === user?.id) ??
    workspaces[0] ??
    null

  const setActive = (id: string) => {
    if (id === active?.id) return
    workspaceStore.set(id)
    setActiveId(id)
    // every resource query is workspace-scoped — start fresh
    queryClient.clear()
  }

  return (
    <WorkspaceContext.Provider value={{ workspaces, active, setActive }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
