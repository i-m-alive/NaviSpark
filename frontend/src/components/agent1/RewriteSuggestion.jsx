import { Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function RewriteSuggestion({ rewrite }) {
  const [expanded, setExpanded] = useState(true)

  if (!rewrite) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pencil size={15} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white">Rewrite Suggestion</span>
          {rewrite.section && <span className="text-xs text-gray-500">— {rewrite.section}</span>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Before</p>
            <div className="bg-red-950/20 border border-red-900/40 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-300 leading-relaxed">{rewrite.original}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">After</p>
            <div className="bg-green-950/20 border border-green-900/40 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-200 leading-relaxed">{rewrite.improved}</p>
            </div>
          </div>

          {rewrite.what_changed && (
            <div className="flex gap-2 bg-indigo-950/20 border border-indigo-900/40 rounded-lg px-4 py-3">
              <span className="text-xs text-indigo-400 font-medium shrink-0">Why:</span>
              <p className="text-xs text-indigo-300 leading-relaxed">{rewrite.what_changed}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
