import { useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, XCircle, Minus, ChevronDown, AlertTriangle } from 'lucide-react'

const STATUS_CONFIG = {
  PASS:    { Icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-950/30', label: 'Pass' },
  PARTIAL: { Icon: Minus,        color: 'text-yellow-400', bg: 'bg-yellow-950/30', label: 'Partial' },
  FAIL:    { Icon: XCircle,      color: 'text-red-400',   bg: 'bg-red-950/30',   label: 'Fail' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { Icon: AlertTriangle, color: 'text-gray-500', bg: '', label: status }
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium', cfg.bg, cfg.color)}>
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  )
}

export default function ChecklistCoverageTable({ nc3Results, nc2Output }) {
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})

  if (!nc3Results || !nc3Results.length) return null

  // Flatten all findings into rows with category context
  const rows = []
  nc3Results.forEach((cat) => {
    ;(cat.findings || []).forEach((f) => {
      const nc2Cat = (nc2Output?.categories || []).find((c) => c.id === cat.category_id)
      const item = (nc2Cat?.items || []).find((i) => i.id === f.item_id)
      rows.push({
        category: cat.category_name,
        category_id: cat.category_id,
        item_id: f.item_id,
        item_text: item?.text || f.item_id,
        status: f.status,
        score: f.score,
        evidence: f.evidence,
        gap: f.gap,
      })
    })
  })

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter.toUpperCase())

  const counts = {
    all: rows.length,
    pass: rows.filter((r) => r.status === 'PASS').length,
    partial: rows.filter((r) => r.status === 'PARTIAL').length,
    fail: rows.filter((r) => r.status === 'FAIL').length,
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Full Checklist Coverage ({rows.length} items)
        </h4>
        {/* Filter tabs */}
        <div className="flex gap-1">
          {[
            { key: 'all',     label: `All (${counts.all})` },
            { key: 'pass',    label: `Pass (${counts.pass})` },
            { key: 'partial', label: `Partial (${counts.partial})` },
            { key: 'fail',    label: `Fail (${counts.fail})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-2.5 py-1 rounded text-xs font-medium transition-all',
                filter === key
                  ? 'bg-blue-900 text-blue-200 border border-blue-700'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/50">
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-28">ID</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Criterion</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-20">Category</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-24">Status</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-16">Score</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const key = `${row.category_id}-${row.item_id}`
              const isOpen = expanded[key]
              const hasDetail = row.evidence || row.gap
              return (
                <>
                  <tr
                    key={key}
                    className={clsx(
                      'border-b border-gray-800/50 transition-colors',
                      hasDetail ? 'cursor-pointer hover:bg-gray-800/30' : '',
                      i % 2 === 0 ? 'bg-gray-950/20' : ''
                    )}
                    onClick={() => hasDetail && setExpanded((v) => ({ ...v, [key]: !v[key] }))}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{row.item_id}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-300 max-w-xs">{row.item_text}</td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500 truncate max-w-[120px]">{row.category}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{row.score?.toFixed(1) ?? '—'}</td>
                    <td className="px-2 py-2.5">
                      {hasDetail && (
                        <ChevronDown size={12} className={clsx('text-gray-600 transition-transform', isOpen && 'rotate-180')} />
                      )}
                    </td>
                  </tr>
                  {isOpen && hasDetail && (
                    <tr key={`${key}-detail`} className="border-b border-gray-800/50 bg-gray-950/60">
                      <td colSpan={6} className="px-4 py-3 space-y-1.5">
                        {row.evidence && (
                          <p className="text-xs text-gray-400">
                            <span className="text-gray-600">Evidence: </span>
                            <span className="italic">{row.evidence}</span>
                          </p>
                        )}
                        {row.gap && (
                          <p className="text-xs text-red-300">
                            <span className="text-gray-500 not-italic">Gap: </span>
                            {row.gap}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-600">No items match the selected filter.</div>
        )}
      </div>
    </div>
  )
}
