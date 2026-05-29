import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import NaviSparkLogo from '../components/NaviSparkLogo'
import LoadingSpinner from '../components/LoadingSpinner'
import { Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react'

// ── Password rules (same as RegisterPage) ─────────────────────────────────────
const RULES = [
  { id: 'len',     label: 'At least 8 characters',           test: p => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A–Z)',       test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'One lowercase letter (a–z)',       test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'One number (0–9)',                 test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$…)',    test: p => /[^A-Za-z0-9]/.test(p) },
]

function EyeButton({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { loginUser } = useAuth()

  const [ready, setReady]         = useState(false)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')
  const [shake, setShake]         = useState(false)

  const results = RULES.map(r => ({ ...r, passed: r.test(password) }))
  const passed  = results.filter(r => r.passed).length

  // Supabase appends the recovery token to the URL when the user clicks
  // the reset link in their email. The JS client reads it automatically
  // via onAuthStateChange — we wait for the PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if there's already an active session (page reload case)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (passed < 5) {
      setError('Your password does not meet all the requirements below.')
      triggerShake(); return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      triggerShake(); return
    }

    setLoading(true)
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // After a successful reset, Supabase may return a session.
      // If so, log the user straight in.
      if (data?.user) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          loginUser(sessionData.session.access_token, {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          })
        }
      }
      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
    } catch (err) {
      setError(err.message || 'Failed to update password. The reset link may have expired.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  // ── Not ready yet (waiting for Supabase to parse the URL token) ────────────
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center auth-bg gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 text-sm">Verifying your reset link…</p>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-16">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="auth-card">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-950 border border-green-800 flex items-center justify-center">
                <CheckCircle size={28} className="text-green-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Password updated</h2>
            <p className="text-sm text-gray-400">Taking you to the dashboard…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Reset form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4">
      <div className="w-full max-w-sm animate-slide-up">

        <div className="flex justify-center mb-8">
          <NaviSparkLogo size="md" animate />
        </div>

        <div className={`auth-card ${shake ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} className="text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">Set new password</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose a strong password for your account.</p>
            </div>
          </div>

          {error && (
            <div className="animate-slide-down bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                />
                <EyeButton show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>

              {/* Strength bar */}
              {password && (
                <div className="mt-2 space-y-1.5 animate-slide-down">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full strength-bar ${
                            passed >= i
                              ? passed <= 1 ? 'bg-red-500'
                              : passed <= 2 ? 'bg-orange-500'
                              : passed <= 3 ? 'bg-yellow-500'
                              : passed <= 4 ? 'bg-teal-500'
                              : 'bg-green-500'
                              : 'bg-transparent'
                          }`}
                          style={{ width: passed >= i ? '100%' : '0%' }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    passed <= 1 ? 'text-red-400'
                    : passed <= 2 ? 'text-orange-400'
                    : passed <= 3 ? 'text-yellow-400'
                    : passed <= 4 ? 'text-teal-400'
                    : 'text-green-400'
                  }`}>
                    {['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][passed]}
                  </p>
                  <div className="space-y-1 pt-1">
                    {results.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                          r.passed ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700'
                        }`}>
                          {r.passed && <span className="text-green-400 text-[8px] font-bold">✓</span>}
                        </div>
                        <span className={`text-xs transition-colors duration-200 ${r.passed ? 'text-gray-400' : 'text-gray-600'}`}>
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
              <label className="label">Confirm new password</label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'}
                  className={`input-field pr-10 ${
                    confirm && password !== confirm ? 'input-error' : ''
                  }`}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <EyeButton show={showCf} onToggle={() => setShowCf(v => !v)} />
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-400 mt-1 animate-slide-down">Passwords do not match.</p>
              )}
              {confirm && password === confirm && confirm.length > 0 && (
                <p className="text-xs text-green-400 mt-1 animate-slide-down">Passwords match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || passed < 5 || password !== confirm}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <><LoadingSpinner size="sm" /> Updating…</> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
