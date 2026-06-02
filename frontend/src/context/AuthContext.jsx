import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(localStorage.getItem('navispark_token'))
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const TOKEN_KEY   = 'navispark_token'
  const REFRESH_KEY = 'navispark_refresh_token'

  // On mount: validate stored token and restore session including name/avatar.
  useEffect(() => {
    if (token) {
      getMe()
        .then(data => {
          setUser({
            id:         data.user_id,
            email:      data.email,
            name:       data.full_name  || null,
            avatar_url: data.avatar_url || null,
          })
          setIsAdmin(data.is_admin === true)
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_KEY)
          setToken(null)
          setUser(null)
          setIsAdmin(false)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  // When any API call detects an expired session (refresh token rejected),
  // clear state immediately so ProtectedRoute redirects to /login.
  useEffect(() => {
    const handleExpired = () => {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      setToken(null)
      setUser(null)
      setIsAdmin(false)
      setLoading(false)
    }
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [])

  // ── Email / password login ─────────────────────────────────────────────────
  // userData shape: { id, email, name?, avatar_url? }
  const loginUser = (accessToken, userData, refreshToken = null) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    setToken(accessToken)
    setUser(userData)
    // is_admin will be resolved on next getMe() call (triggered by token change above)
  }

  // ── OAuth (Google / GitHub) ────────────────────────────────────────────────
  const loginWithOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw new Error(error.message)
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logoutUser = async () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem('navispark_user')
    setToken(null)
    setUser(null)
    setIsAdmin(false)
    try { await supabase.auth.signOut() } catch (_) {}
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, loginUser, loginWithOAuth, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
