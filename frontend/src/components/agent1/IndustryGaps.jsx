import SeverityBadge from '../SeverityBadge'
import { Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function IndustryGaps({ gaps }) {
  const [expanded, setExpanded] = useState(true)

  if (!gaps || gaps.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Industry-Specific Coverage</h3>
        <p className="text-xs text-green-400">✓ No industry-specific gaps detected.</p>
      </div>
    )
  }

  const major = gaps.filter(g => g.severity === 'MAJOR').length
  const minor = gaps.filter(g => g.severity === 'MINOR').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">Industry-Specific Gaps</span>
          <span className="text-xs font-mono text-gray-500">{gaps.length} found</span>
        </div>
        <div className="flex items-center gap-2">
          {major > 0 && <span className="text-xs bg-orange-950 text-orange-300 border border-orange-800 px-2 py-0.5 rounded-full">{major} major</span>}
          {minor > 0 && <span className="text-xs bg-yellow-950 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded-full">{minor} minor</span>}
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-800">
          {gaps.map((gap, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-950 border border-blue-900 px-2 py-0.5 rounded">
                    {gap.industry_lens}
                  </span>
                </div>
                <SeverityBadge severity={gap.severity} />
              </div>
              <p className="text-xs text-gray-200 font-medium">{gap.gap}</p>
              {gap.why_it_matters && (
                <p className="text-xs text-gray-400">{gap.why_it_matters}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
