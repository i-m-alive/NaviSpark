import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminActivity } from '../../api/admin'
import { Activity, Search, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  complete:         'text-green-400  bg-green-900/20  border-green-800',
  pipeline_running: 'text-blue-400   bg-blue-900/20   border-blue-800',
  pipeline_failed:  'text-red-400    bg-red-900/20    border-red-800',
  agents_complete:  'text-teal-400   bg-teal-900/20   border-teal-800',
  ready:            'text-gray-300   bg-gray-800/40   border-gray-700',
  cancelled:        'text-gray-400   bg-gray-800/20   border-gray-700',
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [limit, setLimit]           = useState(50)

  const load = () => {
    setLoading(true)
    getAdminActivity(limit)
      .then(data => setActivities(data.activities || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [limit])

  const filtered = useMemo(() => {
    if (!search) return activities
    const q = search.toLowerCase()
    return activities.filter(a =>
      (a.user_email || '').toLowerCase().includes(q) ||
      (a.filename   || '').toLowerCase().includes(q) ||
      (a.action     || '').toLowerCase().includes(q)
    )
  }, [activities, search])

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity size={22} className="text-teal-400" /> Activity Log
            </h1>
            <p className="text-sm text-gray-400 mt-1">Recent events across all users — sorted by latest update</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-700 text-xs text-gray-300 focus:outline-none">
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>Last {n}</option>)}
            </select>
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm mb-4">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by user, file or event…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600/50" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-500">No activity found</td></tr>
                  )}
                  {filtered.map((a, i) => {
                    const cls = STATUS_COLORS[a.status] || 'text-gray-400 bg-gray-800/30 border-gray-700'
                    return (
                      <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[160px]">{a.user_email || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[180px]">{a.filename || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{a.proposal_type || a.file_type || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>{a.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
