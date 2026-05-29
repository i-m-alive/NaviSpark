import { useState } from 'react'

export default function RewriteSuggestions({ suggestions }) {
  const [expanded, setExpanded] = useState(0)

  if (!suggestions?.length) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
        Top Rewrite Suggestion{suggestions.length > 1 ? 's' : ''}
      </h3>
      <div className="space-y-3">
        {suggestions.map((rw, i) => (
          <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors"
              onClick={() => setExpanded(expanded === i ? -1 : i)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">#{i + 1}</span>
                <span className="text-sm text-white">{rw.section || 'Rewrite suggestion'}</span>
              </div>
              <span className="text-gray-600 text-xs">{expanded === i ? '▲' : '▼'}</span>
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
                <div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 mt-3">Original</p>
                  <div className="bg-red-950 border border-red-900 rounded-lg p-3">
                    <p className="text-xs text-red-300 leading-relaxed">{rw.original}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Improved</p>
                  <div className="bg-green-950 border border-green-900 rounded-lg p-3">
                    <p className="text-xs text-green-300 leading-relaxed">{rw.improved}</p>
                  </div>
                </div>
                {rw.what_changed && (
                  <p className="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-3 leading-relaxed">
                    {rw.what_changed}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
