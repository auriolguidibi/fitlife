import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession, RegisterPayload, User, UserPreferences } from '@/types'
import { api } from '@/services'

interface AuthContextValue {
  session: AuthSession | null
  user: User | null
  preferences: UserPreferences | null
  loading: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  login: (email: string, password: string) => Promise<AuthSession>
  register: (payload: RegisterPayload) => Promise<AuthSession>
  logout: () => Promise<void>
  /** Relit l'utilisateur (après un paiement, un changement de rôle…). */
  refresh: () => Promise<void>
  updateUser: (patch: Partial<User>) => Promise<void>
  /** Remplace l'utilisateur courant par la version renvoyée par l'API. */
  setUser: (user: User) => void
  savePreferences: (prefs: Partial<UserPreferences>) => Promise<AuthSession>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSession(api.getSession())
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const s = await api.login(email, password)
    setSession(s)
    return s
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const s = await api.register(payload)
    setSession(s)
    return s
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setSession(null)
  }, [])

  const refresh = useCallback(async () => {
    const s = api.getSession()
    if (!s) {
      setSession(null)
      return
    }
    setSession(s)
    try {
      const user = await api.getProfile()
      setSession((prev) => (prev ? { ...prev, user } : prev))
    } catch {
      /* hors ligne : on garde la session en cache */
    }
  }, [])

  const setUser = useCallback((user: User) => {
    setSession((prev) => (prev ? { ...prev, user } : prev))
  }, [])

  const updateUser = useCallback(async (patch: Partial<User>) => {
    const user = await api.updateProfile(patch)
    setSession((prev) => (prev ? { ...prev, user } : prev))
  }, [])

  const savePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    const s = await api.savePreferences(prefs)
    setSession(s)
    return s
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      preferences: session?.preferences ?? null,
      loading,
      isAuthenticated: !!session,
      needsOnboarding: !!session && !session.preferences.onboarded,
      login,
      register,
      logout,
      refresh,
      updateUser,
      setUser,
      savePreferences,
    }),
    [session, loading, login, register, logout, refresh, updateUser, setUser, savePreferences],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
