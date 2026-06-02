import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminSessions, deleteAdminSession } from '../../api/admin'
import { FileText, Search, Loader2, AlertTriangle, Trash2, RefreshCw, ChevronDown } from 'lucide-react'

const STATUS_COLORS = {
  complete:         'text-green-400  bg-green-900/20  border-green-800',
  pipeline_running: 'text-blue-400   bg-blue-900/20   border-blue-800',
  pipeline_failed:  'text-red-400    bg-red-900/20    border-red-800',
  agents_complete:  'text-teal-400   bg-teal-900/20   border-teal-800',
  ready:            'text-gray-300   bg-gray-800/40   border-gray-700',
  cancelled:        'text-gray-400   bg-gray-800/20   border-gray-700',
  uploading:        'text-amber-400  bg-amber-900/20  border-amber-800',
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'text-gray-400 bg-gray-800/30 border-gray-700'
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>{status?.replace(/_/g, ' ')}</span>
}

const STATUS_OPTIONS = ['all', 'complete', 'pipeline_running', 'pipeline_failed', 'agents_complete', 'ready', 'cancelled']

export default function AdminSessionsPage() {
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [deleting, setDeleting]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const load = () => {
    setLoading(true)
    getAdminSessions({ limit: 200, status: statusFilter !== 'all' ? statusFilter : undefined })
      .then(data => setSessions(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [statusFilter])

  const filtered = useMemo(() => {
    if (!search) return sessions
    const q = search.toLowerCase()
    return sessions.filter(s =>
      (s.user_email || '').toLowerCase().includes(q) ||
      (s.original_filename || '').toLowerCase().includes(q) ||
      (s.proposal_type || '').toLowerCase().includes(q)
    )
  }, [sessions, search])

  const handleDelete = async (sessionId) => {
    setDeleting(sessionId)
    setConfirmDel(null)
    try {
      await deleteAdminSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText size={22} className="text-purple-400" /> Sessions
            </h1>
            <p className="text-sm text-gray-400 mt-1">{sessions.length} sessions loaded</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm mb-4">
            <AlertTriangle size={15} /> {error}
            <button className="ml-auto text-xs text-red-500 hover:text-red-300" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, filename, type…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600/50" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700 text-sm text-gray-200 focus:outline-none focus:border-blue-600/50 cursor-pointer">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pages</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-500">No sessions found</td></tr>
                  )}
                  {filtered.map(s => {
                    const score = s.agent4_output?.overall_score
                    return (
                      <tr key={s.id} className={`hover:bg-gray-800/20 transition-colors ${deleting === s.id ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[160px]">{s.user_email || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-200 truncate max-w-[180px]">{s.original_filename || '—'}</p>
                          <p className="text-xs text-gray-500">{s.proposal_type || ''} {s.file_type ? `· ${s.file_type.toUpperCase()}` : ''}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {score != null ? (
                            <span className={score >= 7 ? 'text-green-400' : score >= 5 ? 'text-amber-400' : 'text-red-400'}>
                              {score.toFixed(1)}
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.page_count ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {confirmDel === s.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(s.id)}
                                className="px-2 py-1 rounded-lg text-[10px] bg-red-600 text-white hover:bg-red-700">Confirm</button>
                              <button onClick={() => setConfirmDel(null)}
                                className="px-2 py-1 rounded-lg text-[10px] border border-gray-700 text-gray-400 hover:bg-gray-800">Cancel</button>
                            </div>
                          ) : (
                            <button title="Delete session" onClick={() => setConfirmDel(s.id)}
                              disabled={deleting === s.id}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
