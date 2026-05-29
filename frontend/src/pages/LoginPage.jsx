import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/client'
import NaviSparkLogo from '../components/NaviSparkLogo'
import LoadingSpinner from '../components/LoadingSpinner'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

// ── OAuth icons ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function OAuthButton({ provider, icon: Icon, label, onClick, loading }) {
  return (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-600 rounded-lg text-sm text-gray-200 font-medium transition-all duration-150"
    >
      {loading ? <LoadingSpinner size="sm" /> : <Icon />}
      {label}
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [shake, setShake]       = useState(false)
  const { loginUser, loginWithOAuth } = useAuth()
  const navigate = useNavigate()

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      loginUser(data.access_token, { id: data.user_id, email: data.email })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setError('')
    setOauthLoading(provider)
    try {
      await loginWithOAuth(provider)
    } catch (err) {
      setError(err.message)
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-4 animate-fade-in">
          <NaviSparkLogo size="sm" animate />
        </div>

        {/* Card */}
        <div className={`auth-card animate-slide-up ${shake ? 'animate-shake' : ''}`}>
          <h2 className="text-base font-semibold text-white mb-0.5">Welcome back</h2>
          <p className="text-xs text-gray-500 mb-3">Sign in to your NaviSpark account.</p>

          {error && (
            <div className="animate-slide-down bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-2 mb-3">
            <OAuthButton provider="google" icon={GoogleIcon} label="Continue with Google"
              onClick={handleOAuth} loading={oauthLoading === 'google'} />
            <OAuthButton provider="github" icon={GitHubIcon} label="Continue with GitHub"
              onClick={handleOAuth} loading={oauthLoading === 'github'} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Mail size={13} className="text-gray-600" />
                </div>
                <input
                  type="email"
                  className="input-field pl-9 py-2 text-sm"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock size={13} className="text-gray-600" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pl-9 pr-10 py-2 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
            >
              {loading ? <><LoadingSpinner size="sm" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-3 animate-slide-up-delay">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
