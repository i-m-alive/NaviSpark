import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../api/client'
import {
  LayoutDashboard, Users, FileText, Coins, Activity,
  LogOut, ArrowLeft, Shield,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/admin/users',        icon: Users,           label: 'Users'        },
  { to: '/admin/sessions',     icon: FileText,        label: 'Sessions'     },
  { to: '/admin/token-usage',  icon: Coins,           label: 'Token Usage'  },
  { to: '/admin/activity',     icon: Activity,        label: 'Activity Log' },
]

function SidebarLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
        active
          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 border border-transparent'
      }`}
    >
      <Icon size={16} className={active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} />
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
    </Link>
  )
}

export default function AdminLayout({ children }) {
  const { user, logoutUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const at = (path) => path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(path)

  const handleLogout = async () => {
    try { await logout() } catch {}
    logoutUser()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--t-bg, #09090f)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-60 flex flex-col z-30"
        style={{
          background: 'rgba(8,10,18,0.97)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800/60">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30">
            <Shield size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Admin Panel</p>
            <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">NaviSpark</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.to} {...item} active={at(item.to)} />
          ))}
        </nav>

        {/* Bottom: back to app + user + sign out */}
        <div className="px-3 py-4 border-t border-gray-800/60 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-all duration-150 border border-transparent hover:border-gray-700"
          >
            <ArrowLeft size={13} />
            Back to App
          </Link>

          {user && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/60 border border-gray-800">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {(user.name || user.email || 'A')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 font-medium truncate">{user.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-all duration-150 border border-transparent hover:border-red-900/40"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
