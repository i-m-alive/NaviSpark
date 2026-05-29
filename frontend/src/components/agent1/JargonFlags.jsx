import { ChevronDown, ChevronUp, Languages } from 'lucide-react'
import { useState } from 'react'

export default function JargonFlags({ flags }) {
  const [expanded, setExpanded] = useState(true)

  if (!flags || flags.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Languages size={15} className="text-teal-400" />
          <span className="text-sm font-semibold text-white">Jargon Density Flags</span>
          <span className="text-xs font-mono text-gray-500">{flags.length} passage{flags.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full">Non-technical audience</span>
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-800">
          {flags.map((flag, i) => (
            <div key={i} className="px-5 py-4 space-y-3">
              {flag.passage && (
                <blockquote className="text-xs text-gray-300 bg-gray-950 border-l-2 border-teal-800 px-3 py-2 rounded-r italic">
                  "{flag.passage}…"
                </blockquote>
              )}
              {flag.jargon_terms && flag.jargon_terms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-gray-500 self-center">Terms:</span>
                  {flag.jargon_terms.map((term, j) => (
                    <span key={j} className="text-xs font-mono bg-gray-800 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">
                      {term}
                    </span>
                  ))}
                </div>
              )}
              {flag.plain_language_suggestion && (
                <div className="flex gap-2">
                  <span className="text-xs text-teal-400 font-medium shrink-0">Plain English:</span>
                  <p className="text-xs text-teal-300">{flag.plain_language_suggestion}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
