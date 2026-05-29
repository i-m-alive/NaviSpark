import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/client'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(localStorage.getItem('navispark_token'))
  const [loading, setLoading] = useState(true)

  // On mount: validate stored token and restore session including name/avatar.
  useEffect(() => {
    if (token) {
      getMe()
        .then(data => setUser({
          id:         data.user_id,
          email:      data.email,
          name:       data.full_name  || null,
          avatar_url: data.avatar_url || null,
        }))
        .catch(() => {
          localStorage.removeItem('navispark_token')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  // ── Email / password login ─────────────────────────────────────────────────
  // userData shape: { id, email, name?, avatar_url? }
  const loginUser = (accessToken, userData) => {
    localStorage.setItem('navispark_token', accessToken)
    setToken(accessToken)
    setUser(userData)
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
    localStorage.removeItem('navispark_token')
    localStorage.removeItem('navispark_user')
    setToken(null)
    setUser(null)
    try { await supabase.auth.signOut() } catch (_) {}
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, loginWithOAuth, logoutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
