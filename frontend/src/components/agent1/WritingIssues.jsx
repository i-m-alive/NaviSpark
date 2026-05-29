import SeverityBadge from '../SeverityBadge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const TYPE_LABELS = {
  filler_phrase:            'Filler Phrase',
  hidden_accountability:    'Hidden Accountability',
  template_smell:           'Template Smell',
  inconsistent_terminology: 'Inconsistent Terminology',
  unsubstantiated_claim:    'Unsubstantiated Claim',
}

const TYPE_COLORS = {
  filler_phrase:            'text-purple-400 bg-purple-950 border-purple-900',
  hidden_accountability:    'text-orange-400 bg-orange-950 border-orange-900',
  template_smell:           'text-yellow-400 bg-yellow-950 border-yellow-900',
  inconsistent_terminology: 'text-blue-400 bg-blue-950 border-blue-900',
  unsubstantiated_claim:    'text-red-400 bg-red-950 border-red-900',
}

export default function WritingIssues({ issues }) {
  const [expanded, setExpanded] = useState(true)

  if (!issues || issues.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Writing Quality</h3>
        <p className="text-xs text-green-400">✓ No significant writing issues detected.</p>
      </div>
    )
  }

  const critical = issues.filter(i => i.severity === 'CRITICAL').length
  const major    = issues.filter(i => i.severity === 'MAJOR').length
  const minor    = issues.filter(i => i.severity === 'MINOR').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Writing Quality Issues</span>
          <span className="text-xs font-mono text-gray-500">{issues.length} found</span>
        </div>
        <div className="flex items-center gap-2">
          {critical > 0 && <span className="text-xs bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">{critical} critical</span>}
          {major > 0    && <span className="text-xs bg-orange-950 text-orange-300 border border-orange-800 px-2 py-0.5 rounded-full">{major} major</span>}
          {minor > 0    && <span className="text-xs bg-yellow-950 text-yellow-300 border border-yellow-800 px-2 py-0.5 rounded-full">{minor} minor</span>}
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-800">
          {issues.map((issue, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={issue.severity} />
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${TYPE_COLORS[issue.type] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                  {TYPE_LABELS[issue.type] || issue.type}
                </span>
                {issue.location && <span className="text-xs text-gray-600">in {issue.location}</span>}
              </div>
              {issue.quote && (
                <blockquote className="text-xs text-gray-300 bg-gray-950 border-l-2 border-gray-700 px-3 py-2 rounded-r italic">
                  "{issue.quote}"
                </blockquote>
              )}
              {issue.why && <p className="text-xs text-gray-400">{issue.why}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
