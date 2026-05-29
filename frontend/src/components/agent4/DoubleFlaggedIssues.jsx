const AGENT_BADGE = {
  'Agent 1': 'bg-indigo-950 text-indigo-400 border-indigo-800',
  'Agent 2': 'bg-purple-950 text-purple-400 border-purple-800',
  'Agent 3': 'bg-teal-950 text-teal-400 border-teal-800',
}

export default function DoubleFlaggedIssues({ issues }) {
  if (!issues?.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Double-Flagged Issues
        </h3>
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950 border border-green-900 rounded-lg px-3 py-2.5">
          <span>✓</span>
          <span>No issues were independently flagged by two or more agents.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-red-900 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-red-900 flex items-start gap-3 bg-red-950">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
          <span className="text-white text-[10px] font-bold">!</span>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-red-300 uppercase tracking-wider">
            Double-Flagged Issues — Highest Priority
          </h3>
          <p className="text-xs text-red-400 mt-0.5">
            {issues.length} issue{issues.length !== 1 ? 's were' : ' was'} independently detected by two or more specialist agents.
            These automatically rank first in the Must Fix list.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {issues.map((issue, i) => (
          <div key={i} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-900 border border-red-700 flex items-center justify-center text-xs font-bold text-red-300 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {/* Agent tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {issue.agents?.map(a => (
                    <span key={a} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${AGENT_BADGE[a] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                      {a}
                    </span>
                  ))}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-red-950 text-red-400 border-red-800">
                    CRITICAL
                  </span>
                </div>

                {/* Issue summary */}
                <p className="text-sm text-white leading-snug mb-2">{issue.issue_summary}</p>

                {/* Shared keywords */}
                {issue.shared_keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-gray-600 self-center">Shared signals:</span>
                    {issue.shared_keywords.map(kw => (
                      <span key={kw} className="text-[10px] font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Individual agent quotes */}
                {issue.agent_quotes?.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    {issue.agent_quotes.map((quote, qi) => (
                      <p key={qi} className="text-[11px] text-gray-500 italic border-l-2 border-gray-700 pl-2 leading-snug">
                        "{quote}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
