import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/client'
import { useAuth } from '../context/AuthContext'
import NaviSparkLogo from '../components/NaviSparkLogo'
import LoadingSpinner from '../components/LoadingSpinner'
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react'

// ── Password rules ─────────────────────────────────────────────────────────────
const RULES = [
  { id: 'len',     label: 'At least 8 characters',         test: p => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',     test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',     test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0–9)',               test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',  test: p => /[^A-Za-z0-9]/.test(p) },
]

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
const STRENGTH_COLOURS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-teal-400', 'text-green-400']
const BAR_COLOURS      = ['', 'bg-red-500',  'bg-orange-500',  'bg-yellow-500',  'bg-teal-500',   'bg-green-500']

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

function EyeButton({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
      className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
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
export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [shake, setShake]       = useState(false)
  const { loginWithOAuth }      = useAuth()
  const navigate                = useNavigate()

  // ── Password rules evaluation ────────────────────────────────────────────
  const results = RULES.map(r => ({ ...r, passed: r.test(password) }))
  const passed  = results.filter(r => r.passed).length
  const allPass = passed === RULES.length

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!allPass) {
      setError('Password does not meet all requirements.')
      triggerShake(); return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      triggerShake(); return
    }

    setLoading(true)
    try {
      await register(email, password, fullName)
      setSuccess('Account created! Taking you to sign in…')
      setTimeout(() => navigate('/login'), 1800)
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

  const confirmMatch = confirm.length > 0 && password === confirm
  const confirmMismatch = confirm.length > 0 && password !== confirm

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-4 animate-fade-in">
          <NaviSparkLogo size="sm" animate />
        </div>

        <div className={`auth-card animate-slide-up ${shake ? 'animate-shake' : ''}`}>
          <h2 className="text-base font-semibold text-white mb-0.5">Create account</h2>
          <p className="text-xs text-gray-500 mb-3">Join NaviSpark and start reviewing proposals smarter.</p>

          {/* Feedback banners */}
          {error && (
            <div className="animate-slide-down bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg mb-3">
              {error}
            </div>
          )}
          {success && (
            <div className="animate-slide-down bg-green-950 border border-green-800 text-green-300 text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
              <span>✓</span> {success}
            </div>
          )}

          {/* OAuth */}
          <div className="space-y-2 mb-3">
            <OAuthButton provider="google" icon={GoogleIcon} label="Sign up with Google"
              onClick={handleOAuth} loading={oauthLoading === 'google'} />
            <OAuthButton provider="github" icon={GitHubIcon} label="Sign up with GitHub"
              onClick={handleOAuth} loading={oauthLoading === 'github'} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or register with email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Full name */}
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User size={13} className="text-gray-600" />
                </div>
                <input
                  type="text"
                  className="input-field pl-9 py-2 text-sm"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Work email</label>
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
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock size={13} className="text-gray-600" />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pl-9 pr-10 py-2 text-sm"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <EyeButton show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5 animate-slide-down">
                  {/* Bar + label */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full strength-bar rounded-full ${passed >= i ? BAR_COLOURS[passed] : 'bg-transparent'}`}
                            style={{ width: passed >= i ? '100%' : '0%' }}
                          />
                        </div>
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold w-16 text-right ${STRENGTH_COLOURS[passed]}`}>
                      {STRENGTH_LABELS[passed]}
                    </span>
                  </div>

                  {/* Rules — 2 columns to halve vertical space */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {results.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          r.passed ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700'
                        }`}>
                          {r.passed && (
                            <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3.5 6L6.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-[10px] leading-tight transition-colors duration-200 ${r.passed ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock size={13} className={confirmMismatch ? 'text-red-600' : confirmMatch ? 'text-green-600' : 'text-gray-600'} />
                </div>
                <input
                  type={showCf ? 'text' : 'password'}
                  className={`input-field pl-9 pr-10 py-2 text-sm ${confirmMismatch ? 'input-error' : ''}`}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <EyeButton show={showCf} onToggle={() => setShowCf(v => !v)} />
              </div>
              {confirmMismatch && (
                <p className="text-[11px] text-red-400 mt-0.5 animate-slide-down">Passwords do not match.</p>
              )}
              {confirmMatch && (
                <p className="text-[11px] text-green-400 mt-0.5 animate-slide-down">✓ Passwords match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2 text-sm"
            >
              {loading ? <><LoadingSpinner size="sm" /> Creating account…</> : 'Create account'}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-gray-500 text-xs mt-3 animate-slide-up-delay">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
