import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

/**
 * Handles the OAuth redirect from Supabase.
 *
 * Flow:
 *   Google/GitHub  →  Supabase  →  /auth/callback  →  dashboard
 *
 * Supabase appends the session to the URL as a hash fragment
 * (#access_token=...) or as query params. The JS client reads it
 * automatically via getSession() / onAuthStateChange.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      try {
        // Supabase JS client automatically parses the access_token from the URL
        // fragment/query string that Supabase appended on redirect.
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (cancelled) return

        if (sessionError || !data?.session) {
          setError('Authentication failed. The link may have expired — please try again.')
          return
        }

        const { access_token, refresh_token, user } = data.session
        const meta = user.user_metadata || {}

        loginUser(access_token, {
          id:         user.id,
          email:      user.email,
          // Google sets full_name + picture; GitHub sets full_name + avatar_url
          name:       meta.full_name  || meta.name       || null,
          avatar_url: meta.avatar_url || meta.picture    || null,
        }, refresh_token)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        if (!cancelled) setError('Unexpected error during sign-in. Please try again.')
      }
    }

    // Give Supabase's own URL parsing a tick to run first.
    const timer = setTimeout(handleCallback, 100)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [navigate, loginUser])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            NAVI<span className="text-blue-500">SPARK</span>
          </h1>
          <div className="card mt-6">
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-3 rounded-lg mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn-primary w-full"
            >
              Back to Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-500 text-sm">Completing sign-in…</p>
    </div>
  )
}
