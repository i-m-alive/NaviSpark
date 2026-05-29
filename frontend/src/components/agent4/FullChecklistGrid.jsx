import { useState } from 'react'

const SHEET_ORDER = ['Proposal', 'Estimation', 'Pricing']

const STATUS_CONFIG = {
  COVERED: { badge: 'bg-green-900 text-green-300 border-green-700', icon: '✓', bar: 'bg-green-500' },
  PARTIAL:  { badge: 'bg-yellow-900 text-yellow-300 border-yellow-700', icon: '~', bar: 'bg-yellow-500' },
  MISSING:  { badge: 'bg-red-900 text-red-300 border-red-700', icon: '✕', bar: 'bg-red-500' },
}

const AGENT_COLOUR = {
  A1: 'text-indigo-400',
  A2: 'text-purple-400',
  A3: 'text-teal-400',
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.MISSING
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${cfg.badge}`}>
      {cfg.icon} {status}
    </span>
  )
}

function SheetStats({ items }) {
  const covered = items.filter(i => i.status === 'COVERED').length
  const partial  = items.filter(i => i.status === 'PARTIAL').length
  const missing  = items.filter(i => i.status === 'MISSING').length
  const total    = items.length
  const pct      = total > 0 ? Math.round((covered / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500 h-full" style={{ width: `${(covered/total)*100}%` }} />
        <div className="bg-yellow-500 h-full" style={{ width: `${(partial/total)*100}%` }} />
        <div className="bg-red-500 h-full"  style={{ width: `${(missing/total)*100}%` }} />
      </div>
      <span className="text-gray-500 font-mono flex-shrink-0">{covered}/{total} covered</span>
    </div>
  )
}

export default function FullChecklistGrid({ checklistCoverage }) {
  const [activeSheet, setActiveSheet] = useState('Proposal')
  const [showInternal, setShowInternal] = useState(false)

  if (!checklistCoverage?.length) return null

  const bySheet = {}
  SHEET_ORDER.forEach(s => { bySheet[s] = [] })
  checklistCoverage.forEach(item => {
    if (bySheet[item.sheet]) bySheet[item.sheet].push(item)
  })

  const displayItems = bySheet[activeSheet]?.filter(i => showInternal || !i.internal) || []

  const totalCovered = checklistCoverage.filter(i => i.status === 'COVERED').length
  const totalMissing = checklistCoverage.filter(i => i.status === 'MISSING').length
  const totalPartial = checklistCoverage.filter(i => i.status === 'PARTIAL').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            GSK Checklist Coverage — All 3 Sheets
          </h3>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400 font-mono">{totalCovered} covered</span>
            <span className="text-yellow-400 font-mono">{totalPartial} partial</span>
            <span className="text-red-400 font-mono">{totalMissing} missing</span>
          </div>
        </div>

        {/* Sheet tabs */}
        <div className="flex gap-1 mt-3">
          {SHEET_ORDER.map(sheet => {
            const items = bySheet[sheet] || []
            const missingCount = items.filter(i => i.status === 'MISSING').length
            return (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  activeSheet === sheet
                    ? 'bg-gray-800 text-white border-gray-600'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {sheet}
                <span className="font-mono text-[10px] text-gray-600">({items.length})</span>
                {missingCount > 0 && (
                  <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-1 rounded">
                    {missingCount}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={() => setShowInternal(v => !v)}
            className={`ml-auto flex items-center gap-1 px-2 py-1 text-[10px] rounded border transition-colors ${
              showInternal ? 'bg-amber-950 text-amber-400 border-amber-800' : 'text-gray-600 border-gray-800 hover:text-gray-400'
            }`}
          >
            ⚠ Internal
          </button>
        </div>

        <div className="mt-2">
          <SheetStats items={bySheet[activeSheet] || []} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-600 font-mono font-normal px-4 py-2 w-16">ID</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2">Topic</th>
              <th className="text-center text-gray-600 font-normal px-3 py-2 w-20">Mandatory</th>
              <th className="text-center text-gray-600 font-normal px-3 py-2 w-28">Status</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2 w-16">Agent</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, i) => (
              <tr
                key={item.id}
                className={`border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors group ${
                  item.internal ? 'opacity-70' : ''
                }`}
                title={item.note || ''}
              >
                <td className="px-4 py-2.5 font-mono text-gray-500">{item.id}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">{item.topic}</span>
                    {item.internal && (
                      <span className="text-[9px] font-mono text-amber-600 border border-amber-900 px-1 rounded">INTERNAL</span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-gray-600 text-[10px] mt-0.5 leading-snug hidden group-hover:block max-w-xs truncate">
                      {item.note}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {item.mandatory ? (
                    <span className="text-xs text-indigo-400">✓</span>
                  ) : (
                    <span className="text-xs text-gray-700">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <StatusBadge status={item.status} />
                </td>
                <td className={`px-3 py-2.5 font-mono font-medium ${AGENT_COLOUR[item.primary_agent] || 'text-gray-500'}`}>
                  {item.primary_agent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
