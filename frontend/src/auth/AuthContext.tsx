import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/api/resources'
import { tokenStore, UNAUTHORIZED_EVENT, workspaceStore } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import type { User } from '@/types'

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from a stored token on first load.
  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        tokenStore.clear()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Log out automatically if any request returns 401.
  useEffect(() => {
    const handler = () => {
      setUser(null)
      queryClient.clear()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handler)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    tokenStore.set(res.token)
    queryClient.clear()
    setUser(res.user)
  }

  const register = async (email: string, password: string) => {
    const res = await authApi.register(email, password)
    tokenStore.set(res.token)
    queryClient.clear()
    setUser(res.user)
  }

  const logout = () => {
    tokenStore.clear()
    workspaceStore.clear()
    queryClient.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
