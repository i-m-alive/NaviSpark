import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/client'
import { LogOut, Home, Upload, BookOpen, Menu, X } from 'lucide-react'
import NaviSparkLogo from './NaviSparkLogo'
import { ThemeSwitcher } from './ThemePicker'

// ── Spark SVG mark only (for the animated logo in nav) ───────────────────────
function SparkMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="rgba(59,130,246,0.08)" />
      <circle cx="20" cy="20" r="18" stroke="rgba(59,130,246,0.18)" strokeWidth="1" />
      <path
        d="M22.5 8 L13 22 L19.5 22 L17.5 32 L27 18 L20.5 18 Z"
        fill="url(#navBolt)"
      />
      <circle cx="10" cy="12" r="1.1" fill="#60a5fa" opacity="0.6" />
      <circle cx="30" cy="10" r="0.8" fill="#93c5fd" opacity="0.45" />
      <circle cx="32" cy="28" r="1"   fill="#60a5fa" opacity="0.5" />
      <defs>
        <linearGradient id="navBolt" x1="13" y1="8" x2="27" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#93c5fd" />
          <stop offset="50%"  stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Nav link with animated active indicator ──────────────────────────────────
function NavLink({ to, icon: Icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active
          ? 'text-white bg-gray-800'
          : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/60'
      }`}
    >
      <Icon
        size={14}
        className={`transition-colors duration-200 ${active ? 'text-blue-400' : 'group-hover:text-gray-300'}`}
      />
      {label}
      {/* Active underline dot */}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500 -mb-[1px]" />
      )}
    </Link>
  )
}

// ── Mobile nav link (full width) ─────────────────────────────────────────────
function MobileNavLink({ to, icon: Icon, label, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-white bg-gray-800 border border-gray-700'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
      }`}
    >
      <Icon size={16} className={active ? 'text-blue-400' : ''} />
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
    </Link>
  )
}

// ── User avatar — real photo for OAuth, letter fallback for email/password ────
function UserAvatar({ name, email, avatarUrl }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || email}
        referrerPolicy="no-referrer"
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-700"
      />
    )
  }
  const initial = ((name || email || 'U')[0]).toUpperCase()
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm">
      {initial}
    </div>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile menu on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    try { await logout() } catch {}
    logoutUser()
    navigate('/login')
    setMobileOpen(false)
  }

  const at = (path) => location.pathname === path

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'var(--t-nav, rgba(9,11,17,0.88))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(128,128,128,0.12)',
          boxShadow: '0 1px 0 0 rgba(59,130,246,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between" style={{ height: 60 }}>

            {/* ── Logo ───────────────────────────────────────────────────────── */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 group"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ filter: 'drop-shadow(0 0 0px rgba(59,130,246,0))' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(99,102,241,0.6))'}
                onMouseLeave={e => e.currentTarget.style.filter = 'drop-shadow(0 0 0px rgba(59,130,246,0))'}
              >
                <SparkMark size={34} />
              </div>

              <div className="flex flex-col leading-none">
                <span className="font-black tracking-tight text-[20px]">
                  <span
                    className="text-white"
                    style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}
                  >
                    NAVI
                  </span>
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
                      letterSpacing: '-0.02em',
                    }}
                  >
                    SPARK
                  </span>
                </span>
                <span className="text-[9.5px] text-gray-600 uppercase tracking-[0.2em] font-medium mt-0.5 hidden sm:block">
                  Proposal Intelligence
                </span>
              </div>
            </Link>

            {/* ── Centre nav links — DESKTOP only ─────────────────────────────── */}
            <div className="hidden md:flex items-center gap-0.5">
              <NavLink to="/dashboard"    icon={Home}     label="Home"         active={at('/dashboard')} />
              <NavLink to="/upload"       icon={Upload}   label="New Review"   active={at('/upload')} />
              <NavLink to="/how-it-works" icon={BookOpen} label="How It Works" active={at('/how-it-works')} />
            </div>

            {/* ── Right: theme switcher + user info + sign out — DESKTOP ────────── */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeSwitcher />

              {user?.email && (
                <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800">
                  <UserAvatar name={user.name} email={user.email} avatarUrl={user.avatar_url} />
                  <div className="flex flex-col leading-tight">
                    {user.name && (
                      <span className="text-xs text-gray-200 font-medium max-w-[130px] truncate">{user.name}</span>
                    )}
                    <span className={`text-gray-500 max-w-[130px] truncate ${user.name ? 'text-[10px]' : 'text-xs'}`}>
                      {user.email}
                    </span>
                  </div>
                </div>
              )}

              {/* Sign out */}
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 border border-transparent hover:border-red-900/50"
              >
                <LogOut size={14} />
                <span className="hidden lg:inline text-xs font-medium">Sign out</span>
              </button>
            </div>

            {/* ── Mobile right: theme + hamburger ─────────────────────────────── */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeSwitcher />
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle navigation menu"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-all duration-200 border border-transparent hover:border-gray-700"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

          </div>
        </div>

        {/* ── Bottom gradient accent line ─────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.25) 30%, rgba(99,102,241,0.2) 60%, transparent 100%)',
          }}
        />
      </nav>

      {/* ── Mobile menu drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div
            className="fixed top-[60px] left-0 right-0 z-40 md:hidden"
            style={{
              background: 'var(--t-nav, rgba(9,11,17,0.97))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(128,128,128,0.15)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              animation: 'slide-down-fade 0.2s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1.5">
              {/* Nav links */}
              <MobileNavLink to="/dashboard"    icon={Home}     label="Home"         active={at('/dashboard')}    onClick={() => setMobileOpen(false)} />
              <MobileNavLink to="/upload"       icon={Upload}   label="New Review"   active={at('/upload')}       onClick={() => setMobileOpen(false)} />
              <MobileNavLink to="/how-it-works" icon={BookOpen} label="How It Works" active={at('/how-it-works')} onClick={() => setMobileOpen(false)} />

              {/* Divider */}
              <div className="h-px bg-gray-800 my-2" />

              {/* User info */}
              {user?.email && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <UserAvatar name={user.name} email={user.email} avatarUrl={user.avatar_url} />
                  <div className="flex flex-col leading-tight min-w-0">
                    {user.name && (
                      <span className="text-sm text-gray-200 font-medium truncate">{user.name}</span>
                    )}
                    <span className="text-xs text-gray-500 truncate">{user.email}</span>
                  </div>
                </div>
              )}

              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-all duration-200 text-sm font-medium"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
