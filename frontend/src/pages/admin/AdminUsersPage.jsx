import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminUsers, deleteAdminUser, banAdminUser, unbanAdminUser, makeAdmin, revokeAdmin } from '../../api/admin'
import {
  Users, Search, Loader2, AlertTriangle, Shield, ShieldOff,
  Trash2, UserCheck, UserX, RefreshCw, ChevronUp, ChevronDown,
} from 'lucide-react'

function Avatar({ name, email, avatarUrl, size = 8 }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || email} referrerPolicy="no-referrer"
      className={`w-${size} h-${size} rounded-full object-cover ring-1 ring-gray-700`} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[11px] font-bold text-white`}>
      {((name || email || 'U')[0]).toUpperCase()}
    </div>
  )
}

function Badge({ text, variant }) {
  const v = {
    banned:    'bg-red-900/40   text-red-300   border-red-800',
    admin:     'bg-purple-900/40 text-purple-300 border-purple-800',
    active:    'bg-green-900/30 text-green-400  border-green-800',
    unverified:'bg-gray-800/60  text-gray-400   border-gray-700',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${v[variant] || v.active}`}>{text}</span>
  )
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-sm border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [confirm, setConfirm] = useState(null)  // { type, userId, label }
  const [actionLoading, setActionLoading] = useState(null)

  const load = () => {
    setLoading(true)
    getAdminUsers()
      .then(data => setUsers(data.users || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const sorted = useMemo(() => {
    let list = users.filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)
    })
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [users, search, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-400" /> : <ChevronDown size={12} className="text-blue-400" />)
    : null

  const runAction = async () => {
    if (!confirm) return
    const { type, userId } = confirm
    setActionLoading(userId)
    setConfirm(null)
    try {
      if (type === 'delete')       await deleteAdminUser(userId)
      else if (type === 'ban')     await banAdminUser(userId)
      else if (type === 'unban')   await unbanAdminUser(userId)
      else if (type === 'mkadmin') await makeAdmin(userId)
      else if (type === 'rmadmin') await revokeAdmin(userId)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={22} className="text-blue-400" /> Users
            </h1>
            <p className="text-sm text-gray-400 mt-1">{users.length} total accounts</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm mb-4">
            <AlertTriangle size={15} /> {error}
            <button className="ml-auto text-red-500 hover:text-red-300 text-xs" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600/50"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('sessions_count')}>
                      <span className="flex items-center gap-1">Sessions <SortIcon k="sessions_count" /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('total_tokens')}>
                      <span className="flex items-center gap-1">Tokens <SortIcon k="total_tokens" /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                      <span className="flex items-center gap-1">Joined <SortIcon k="created_at" /></span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">No users found</td></tr>
                  )}
                  {sorted.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-800/20 transition-colors ${actionLoading === u.id ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} email={u.email} avatarUrl={u.avatar_url} />
                          <div className="min-w-0">
                            {u.name && <p className="text-sm text-gray-200 font-medium truncate max-w-[140px]">{u.name}</p>}
                            <p className={`text-gray-400 truncate max-w-[180px] ${u.name ? 'text-xs' : 'text-sm'}`}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-200">{u.sessions_count}</span>
                        <span className="text-xs text-gray-500 ml-1">({u.complete_sessions} done)</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{(u.total_tokens ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.is_admin  && <Badge text="Admin"    variant="admin" />}
                          {u.is_banned && <Badge text="Banned"   variant="banned" />}
                          {!u.is_banned && !u.is_admin && <Badge text="Active" variant="active" />}
                          {!u.email_confirmed && <Badge text="Unverified" variant="unverified" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Ban / Unban */}
                          {u.is_banned ? (
                            <button title="Unban user"
                              onClick={() => setConfirm({ type: 'unban', userId: u.id, label: u.email })}
                              className="p-1.5 rounded-lg text-green-500 hover:bg-green-900/30 transition-colors">
                              <UserCheck size={14} />
                            </button>
                          ) : (
                            <button title="Ban user"
                              onClick={() => setConfirm({ type: 'ban', userId: u.id, label: u.email })}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-900/30 transition-colors">
                              <UserX size={14} />
                            </button>
                          )}
                          {/* Admin / Revoke */}
                          {u.is_admin ? (
                            <button title="Revoke admin"
                              onClick={() => setConfirm({ type: 'rmadmin', userId: u.id, label: u.email })}
                              className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-900/30 transition-colors">
                              <ShieldOff size={14} />
                            </button>
                          ) : (
                            <button title="Make admin"
                              onClick={() => setConfirm({ type: 'mkadmin', userId: u.id, label: u.email })}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors">
                              <Shield size={14} />
                            </button>
                          )}
                          {/* Delete */}
                          <button title="Delete user"
                            onClick={() => setConfirm({ type: 'delete', userId: u.id, label: u.email })}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (() => {
        const configs = {
          delete:  { title: 'Delete User',       message: `Permanently delete ${confirm.label} and all their data?`, label: 'Delete',      danger: true  },
          ban:     { title: 'Ban User',           message: `Ban ${confirm.label}? They will be unable to sign in.`,  label: 'Ban User',    danger: true  },
          unban:   { title: 'Unban User',         message: `Remove the ban from ${confirm.label}?`,                  label: 'Unban',       danger: false },
          mkadmin: { title: 'Grant Admin Access', message: `Give admin privileges to ${confirm.label}?`,             label: 'Grant Admin', danger: false },
          rmadmin: { title: 'Revoke Admin Access',message: `Remove admin privileges from ${confirm.label}?`,         label: 'Revoke',      danger: true  },
        }
        const cfg = configs[confirm.type] || {}
        return <ConfirmModal {...cfg} confirmLabel={cfg.label} onConfirm={runAction} onCancel={() => setConfirm(null)} />
      })()}
    </AdminLayout>
  )
}
