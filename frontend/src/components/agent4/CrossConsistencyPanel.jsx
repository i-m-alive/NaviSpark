const SEVERITY_CONFIG = {
  CRITICAL: { badge: 'bg-red-900 text-red-300 border-red-700',    bar: 'bg-red-500' },
  MAJOR:    { badge: 'bg-yellow-900 text-yellow-300 border-yellow-700', bar: 'bg-yellow-500' },
  MINOR:    { badge: 'bg-blue-900 text-blue-300 border-blue-700',  bar: 'bg-blue-500' },
}

const AGENT_BADGE = {
  'Agent 1': 'bg-indigo-950 text-indigo-400 border-indigo-800',
  'Agent 2': 'bg-purple-950 text-purple-400 border-purple-800',
  'Agent 3': 'bg-teal-950 text-teal-400 border-teal-800',
}

export default function CrossConsistencyPanel({ issues }) {
  if (!issues?.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Cross-Agent Consistency Check
        </h3>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950 border border-green-900 rounded-lg px-3 py-2.5">
          <span>✓</span>
          <span>No cross-agent inconsistencies detected across all five consistency checks.</span>
        </div>
      </div>
    )
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Cross-Agent Consistency Check
        </h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono">
              {criticalCount} critical
            </span>
          )}
          <span className="text-xs text-gray-600 font-mono">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {issues.map((issue, i) => {
          const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.MINOR
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-1 rounded-full self-stretch ${sev.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-500">{issue.rule_id}</span>
                    <span className="text-xs text-gray-300 font-medium">{issue.check}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sev.badge}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.finding}</p>
                  {issue.agents_involved?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {issue.agents_involved.map(a => (
                        <span key={a} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${AGENT_BADGE[a] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
