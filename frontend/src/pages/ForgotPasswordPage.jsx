import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import NaviSparkLogo from '../components/NaviSparkLogo'
import LoadingSpinner from '../components/LoadingSpinner'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // After clicking the link in the email, Supabase redirects here.
        // Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs.
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-16">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <NaviSparkLogo size="md" animate />
        </div>

        {sent ? (
          /* ── Success state ─────────────────────────────────────────────── */
          <div className="auth-card animate-fade-in text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-950 border border-green-800 flex items-center justify-center">
                <CheckCircle size={28} className="text-green-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              We sent a password reset link to{' '}
              <span className="text-white font-medium">{email}</span>.
              Check your inbox and click the link to set a new password.
            </p>
            <p className="text-xs text-gray-600">
              Didn't get it? Check spam, or{' '}
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          /* ── Email form ────────────────────────────────────────────────── */
          <div className="auth-card">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Reset password</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your account email and we'll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="animate-slide-down bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Mail size={15} className="text-gray-600" />
                  </div>
                  <input
                    type="email"
                    className="input-field pl-9"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <><LoadingSpinner size="sm" /> Sending…</> : 'Send reset link'}
              </button>
            </form>
          </div>
        )}

        <div className="text-center mt-5">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
