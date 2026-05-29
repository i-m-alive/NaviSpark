import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/client'
import { LogOut, LayoutDashboard, Upload } from 'lucide-react'

export default function Navbar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } catch {}
    logoutUser()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide text-sm">
              NAVI<span className="text-blue-500">SPARK</span>
            </span>
            <span className="text-xs bg-orange-900 text-orange-300 border border-orange-700 px-2 py-0.5 rounded-full font-mono">
              PS03
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
            <Link
              to="/upload"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <Upload size={15} />
              New Review
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
