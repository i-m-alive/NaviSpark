import { clsx } from 'clsx'
import { CheckSquare, AlertTriangle, Scale } from 'lucide-react'

function WeightBar({ weight }) {
  const pct = Math.round((weight || 0) * 100)
  const color = pct >= 30 ? 'bg-orange-500' : pct >= 20 ? 'bg-blue-500' : 'bg-gray-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-7 text-right">{pct}%</span>
    </div>
  )
}

export default function ChecklistPreview({ nc2Summary }) {
  if (!nc2Summary) return null

  const {
    total_items = 0,
    scoring_type,
    weights_source,
    format,
    parse_warnings = [],
    categories = [],
  } = nc2Summary

  const scoringLabel = {
    binary: 'Yes / No',
    scored_1_to_5: '1 – 5 scale',
    scored_1_to_10: '1 – 10 scale',
    weighted_1_to_5: 'Weighted 1 – 5',
  }[scoring_type] || scoring_type

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare size={15} className="text-teal-400" />
        <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
          Checklist Preview — NC2 Parsed Output
        </h3>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-950 text-teal-300 border border-teal-800">
          {total_items} items
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-950 text-blue-300 border border-blue-800">
          {categories.length} categories
        </span>
        {scoringLabel && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-950 text-purple-300 border border-purple-800">
            {scoringLabel}
          </span>
        )}
        {format && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700 uppercase">
            {format}
          </span>
        )}
        {weights_source && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
            Weights: {weights_source}
          </span>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Categories detected</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white leading-snug">{cat.name}</span>
                  <span className="text-[10px] text-gray-500 flex-shrink-0 mt-0.5">
                    {cat.item_count} item{cat.item_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <WeightBar weight={cat.weight} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parse warnings */}
      {parse_warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-950/40 border border-yellow-800/50 rounded-lg">
          <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-yellow-300">Parse warnings</p>
            {parse_warnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-400">{w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
