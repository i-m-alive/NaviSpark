import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminTokenUsage } from '../../api/admin'
import { Coins, Search, Loader2, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'

const AGENT_COLORS = {
  agent1: { bg: 'bg-blue-500',   text: 'text-blue-400'   },
  agent2: { bg: 'bg-purple-500', text: 'text-purple-400' },
  agent3: { bg: 'bg-teal-500',   text: 'text-teal-400'   },
  agent4: { bg: 'bg-amber-500',  text: 'text-amber-400'  },
}

function AgentChip({ name }) {
  const c = AGENT_COLORS[name] || { bg: 'bg-gray-500', text: 'text-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`} />
      {name.replace('agent', 'Agent ')}
    </span>
  )
}

function SummaryCard({ label, value, sub, colorClass }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-sm text-gray-300 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// Per-user aggregation view
function UserAggTable({ records }) {
  const byUser = useMemo(() => {
    const m = {}
    for (const r of records) {
      const key = r.user_email || 'Unknown'
      if (!m[key]) m[key] = { user_email: key, user_name: r.user_name, input: 0, output: 0, total: 0, calls: 0 }
      m[key].input  += r.input_tokens
      m[key].output += r.output_tokens
      m[key].total  += r.total_tokens
      m[key].calls  += 1
    }
    return Object.values(m).sort((a, b) => b.total - a.total)
  }, [records])

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Input</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Output</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">API Calls</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {byUser.map((u, i) => (
            <tr key={i} className="hover:bg-gray-800/20 transition-colors">
              <td className="px-4 py-3">
                <p className="text-sm text-gray-200 truncate max-w-[200px]">{u.user_email}</p>
                {u.user_name && <p className="text-xs text-gray-500 truncate max-w-[200px]">{u.user_name}</p>}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400 text-right">{u.input.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-gray-400 text-right">{u.output.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm font-semibold text-white text-right">{u.total.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-gray-400 text-right">{u.calls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminTokenUsagePage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [view, setView]       = useState('detail')  // 'detail' | 'by-user'

  const load = () => {
    setLoading(true)
    getAdminTokenUsage({ limit: 500 })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const records = data?.records || []

  const filtered = useMemo(() => {
    if (!search) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      (r.user_email || '').toLowerCase().includes(q) ||
      (r.session_filename || '').toLowerCase().includes(q) ||
      (r.agent_name || '').toLowerCase().includes(q)
    )
  }, [records, search])

  // Per-agent totals for the bar chart
  const byAgent = useMemo(() => {
    const m = {}
    for (const r of records) {
      if (!m[r.agent_name]) m[r.agent_name] = 0
      m[r.agent_name] += r.total_tokens
    }
    return m
  }, [records])
  const maxAgent = Math.max(0, ...Object.values(byAgent))

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins size={22} className="text-amber-400" /> Token Usage
            </h1>
            <p className="text-sm text-gray-400 mt-1">All Bedrock API token consumption</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm mb-4">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Total Input Tokens"  colorClass="text-blue-400"
                value={(data?.grand_total_input_tokens ?? 0).toLocaleString()}
                sub="Sent to Claude" />
              <SummaryCard label="Total Output Tokens" colorClass="text-purple-400"
                value={(data?.grand_total_output_tokens ?? 0).toLocaleString()}
                sub="Generated by Claude" />
              <SummaryCard label="Grand Total Tokens"  colorClass="text-amber-400"
                value={(data?.grand_total_tokens ?? 0).toLocaleString()}
                sub={`${records.length} API calls recorded`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Per-agent bar chart */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">By Agent</h2>
                </div>
                {Object.keys(byAgent).length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([name, total]) => {
                      const pct = maxAgent > 0 ? Math.round(total / maxAgent * 100) : 0
                      const c = AGENT_COLORS[name] || { bg: 'bg-gray-500', text: 'text-gray-400' }
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <span className={`text-xs w-14 shrink-0 ${c.text}`}>{name.replace('agent', 'Agent ')}</span>
                          <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                            <div className={`h-full rounded-full ${c.bg}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-16 text-right shrink-0">{total.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search + view toggle */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by user, file, agent…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600/50" />
                </div>
                <div className="flex gap-2">
                  {['detail', 'by-user'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                        view === v
                          ? 'bg-blue-600/20 text-blue-300 border-blue-600/30'
                          : 'text-gray-400 border-gray-700 hover:bg-gray-800'
                      }`}>
                      {v === 'detail' ? 'Detailed Records' : 'By User'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              {view === 'by-user' ? (
                <UserAggTable records={filtered} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Session</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Agent</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Input</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Output</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-500">No records found</td></tr>
                      )}
                      {filtered.map(r => (
                        <tr key={r.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[160px]">{r.user_email || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[160px]">{r.session_filename || '—'}</td>
                          <td className="px-4 py-3"><AgentChip name={r.agent_name} /></td>
                          <td className="px-4 py-3 text-sm text-blue-400 text-right tabular-nums">{r.input_tokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-purple-400 text-right tabular-nums">{r.output_tokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-white text-right tabular-nums">{r.total_tokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {r.created_at ? new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
