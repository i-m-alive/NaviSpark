import SeverityBadge from '../SeverityBadge'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function ScopeIssues({ scopeIssues, highRiskAssumptions }) {
  const [expanded, setExpanded] = useState(true)

  const hasScope = scopeIssues && scopeIssues.length > 0
  const hasAssumptions = highRiskAssumptions && highRiskAssumptions.length > 0

  if (!hasScope && !hasAssumptions) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Scope Clarity</h3>
        <p className="text-xs text-green-400">✓ Scope is clearly defined with no significant gaps.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Scope Clarity</span>
          <div className="flex items-center gap-1.5">
            {hasScope && <span className="text-xs font-mono text-gray-500">{scopeIssues.length} issue{scopeIssues.length !== 1 ? 's' : ''}</span>}
            {hasAssumptions && <span className="text-xs font-mono text-orange-400">{highRiskAssumptions.length} high-risk assumption{highRiskAssumptions.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {hasScope && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope Issues</h4>
              {scopeIssues.map((item, i) => (
                <div key={i} className="bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-200 font-medium">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  {item.location && <p className="text-xs text-gray-500">Location: {item.location}</p>}
                  {item.quote && (
                    <blockquote className="text-xs text-gray-300 bg-gray-900 border-l-2 border-gray-700 px-3 py-2 rounded-r italic">
                      "{item.quote}"
                    </blockquote>
                  )}
                  {item.recommendation && (
                    <div className="flex gap-2 pt-1">
                      <span className="text-xs text-blue-400 font-medium shrink-0">Fix:</span>
                      <p className="text-xs text-blue-300">{item.recommendation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasAssumptions && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} /> High-Risk Assumptions
              </h4>
              {highRiskAssumptions.map((item, i) => (
                <div key={i} className="bg-orange-950/20 border border-orange-900/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-orange-200 font-medium">{item.assumption}</p>
                  {item.location && <p className="text-xs text-orange-400/60">Location: {item.location}</p>}
                  {item.risk_if_wrong && (
                    <div className="flex gap-2 pt-1">
                      <span className="text-xs text-red-400 font-medium shrink-0">If wrong:</span>
                      <p className="text-xs text-red-300">{item.risk_if_wrong}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
