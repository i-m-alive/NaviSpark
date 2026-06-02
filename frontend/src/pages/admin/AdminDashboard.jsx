import { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminStats, getAdminActivity } from '../../api/admin'
import { Users, FileText, Coins, CheckCircle, Activity, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-600/10   border-blue-600/20',  icon: 'text-blue-400'   },
    green:  { bg: 'bg-green-600/10  border-green-600/20', icon: 'text-green-400'  },
    purple: { bg: 'bg-purple-600/10 border-purple-600/20',icon: 'text-purple-400' },
    amber:  { bg: 'bg-amber-600/10  border-amber-600/20', icon: 'text-amber-400'  },
  }
  const c = colors[color] || colors.blue
  return (
    <div className={`rounded-2xl border p-5 ${c.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-gray-900/60`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-sm text-gray-300 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function AgentBar({ name, tokens, maxTokens }) {
  const pct = maxTokens > 0 ? Math.round((tokens / maxTokens) * 100) : 0
  const colors = { agent1: 'bg-blue-500', agent2: 'bg-purple-500', agent3: 'bg-teal-500', agent4: 'bg-amber-500' }
  const color = colors[name] || 'bg-gray-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-14 shrink-0 capitalize">{name.replace('agent', 'Agent ')}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-20 text-right shrink-0">{tokens.toLocaleString()}</span>
    </div>
  )
}

function ActivityRow({ item }) {
  const statusColors = {
    complete:         'text-green-400  bg-green-900/30  border-green-800',
    pipeline_failed:  'text-red-400    bg-red-900/30    border-red-800',
    pipeline_running: 'text-blue-400   bg-blue-900/30   border-blue-800',
    cancelled:        'text-gray-400   bg-gray-800/40   border-gray-700',
  }
  const cls = statusColors[item.status] || 'text-gray-400 bg-gray-800/40 border-gray-700'
  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-200 truncate max-w-[160px]">{item.user_email}</td>
      <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-[180px]">{item.filename || '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{item.action}</span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
      </td>
    </tr>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]         = useState(null)
  const [activity, setActivity]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminActivity(20)])
      .then(([s, a]) => {
        setStats(s)
        setActivity(a.activities || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const byAgent    = stats?.tokens_by_agent || {}
  const maxAgentTok = Math.max(0, ...Object.values(byAgent).map(a => a.total_tokens || 0))

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">System-wide overview — all users and sessions</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-400 text-sm mb-6">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users}       label="Total Users"        value={stats?.total_users?.toLocaleString()}    color="blue" />
              <StatCard icon={FileText}    label="Total Sessions"     value={stats?.total_sessions?.toLocaleString()} color="purple"
                sub={`${stats?.complete_sessions ?? 0} complete`} />
              <StatCard icon={Coins}       label="Total Tokens"       value={(stats?.total_tokens ?? 0).toLocaleString()} color="amber"
                sub={`${(stats?.total_input_tokens ?? 0).toLocaleString()} in / ${(stats?.total_output_tokens ?? 0).toLocaleString()} out`} />
              <StatCard icon={CheckCircle} label="Completed Analyses" value={stats?.complete_sessions?.toLocaleString()} color="green"
                sub={`${stats?.failed_sessions ?? 0} failed`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Token usage by agent */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Token Usage by Agent</h2>
                </div>
                {Object.keys(byAgent).length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No token data yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(byAgent).sort((a, b) => b[1].total_tokens - a[1].total_tokens).map(([name, tok]) => (
                      <AgentBar key={name} name={name} tokens={tok.total_tokens} maxTokens={maxAgentTok} />
                    ))}
                  </div>
                )}
              </div>

              {/* Session status breakdown */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-purple-400" />
                  <h2 className="text-sm font-semibold text-white">Session Status Breakdown</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Completed',   value: stats?.complete_sessions ?? 0,  color: 'bg-green-500'  },
                    { label: 'Failed',      value: stats?.failed_sessions ?? 0,    color: 'bg-red-500'    },
                    { label: 'Running',     value: stats?.running_sessions ?? 0,   color: 'bg-blue-500'   },
                    { label: 'Other/Ready', value: Math.max(0, (stats?.total_sessions ?? 0) - (stats?.complete_sessions ?? 0) - (stats?.failed_sessions ?? 0) - (stats?.running_sessions ?? 0)),
                      color: 'bg-gray-500' },
                  ].map(row => {
                    const pct = stats?.total_sessions > 0 ? Math.round(row.value / stats.total_sessions * 100) : 0
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-20 shrink-0">{row.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right shrink-0">{row.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800">
                <Activity size={15} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No activity recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">User</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">File</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Event</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((item, i) => <ActivityRow key={i} item={item} />)}
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
