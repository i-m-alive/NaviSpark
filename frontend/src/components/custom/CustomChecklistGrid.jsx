/**
 * CustomChecklistGrid — Full Checklist Coverage grid for the Custom Checklist Pipeline.
 *
 * Mirrors FullChecklistGrid's UX (tabbed sheets, search, filters, progress bar) but
 * organises data by NC3 checklist categories instead of GSK-specific Proposal /
 * Estimation / Pricing sheets.
 *
 * Data source: NC3 findings + NC2 category/item metadata.
 */

import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, XCircle, Minus, Search, Filter, ChevronDown } from 'lucide-react'

const STATUS_ORDER  = { COVERED: 0, PARTIAL: 1, MISSING: 2 }
const STATUS_CONFIG = {
  COVERED: { label: 'Covered',  color: 'text-green-400',  bg: 'bg-green-950/40 border-green-900/40',  dot: 'bg-green-400',  Icon: CheckCircle2 },
  PARTIAL: { label: 'Partial',  color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-900/40', dot: 'bg-yellow-400', Icon: Minus        },
  MISSING: { label: 'Missing',  color: 'text-red-400',    bg: 'bg-red-950/40 border-red-900/40',       dot: 'bg-red-400',   Icon: XCircle      },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.MISSING
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border', cfg.bg, cfg.color)}>
      <cfg.Icon size={10} /> {cfg.label}
    </span>
  )
}

function ProgressBar({ covered, partial, missing, total }) {
  if (!total) return null
  const covPct  = (covered  / total) * 100
  const parPct  = (partial  / total) * 100
  const misPct  = (missing  / total) * 100
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-gray-800 w-full">
      <div className="bg-green-500" style={{ width: `${covPct}%` }} />
      <div className="bg-yellow-500" style={{ width: `${parPct}%` }} />
      <div className="bg-red-500"   style={{ width: `${misPct}%` }} />
    </div>
  )
}

export default function CustomChecklistGrid({ nc3Results, nc2Output }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [statusFilter,   setStatusFilter]   = useState('ALL')
  const [search,         setSearch]         = useState('')
  const [showMandatory,  setShowMandatory]  = useState(false)

  if (!nc3Results || !nc3Results.length) return null

  // Build the flat item list with category metadata
  const allItems = useMemo(() => {
    const items = []
    ;(nc3Results || []).forEach(cat => {
      ;(cat.findings || []).forEach(f => {
        const nc2Cat  = (nc2Output?.categories || []).find(c => c.id === cat.category_id)
        const nc2Item = (nc2Cat?.items || []).find(i => i.id === f.item_id)
        const status  = f.status === 'PASS' ? 'COVERED' : f.status === 'PARTIAL' ? 'PARTIAL' : 'MISSING'
        items.push({
          id:           f.item_id,
          category_id:  cat.category_id,
          category:     cat.category_name,
          topic:        nc2Item?.text || f.item_id,
          status,
          mandatory:    (nc2Item?.weight || 0) >= 1.0,
          score:        f.score,
          evidence:     f.evidence,
          gap:          f.gap,
        })
      })
    })
    return items
  }, [nc3Results, nc2Output])

  // Category list for tabs
  const categories = useMemo(() => {
    const seen = new Set()
    const cats = []
    nc3Results.forEach(r => {
      if (!seen.has(r.category_id)) {
        seen.add(r.category_id)
        const catItems = allItems.filter(i => i.category_id === r.category_id)
        const covered  = catItems.filter(i => i.status === 'COVERED').length
        const partial  = catItems.filter(i => i.status === 'PARTIAL').length
        const missing  = catItems.filter(i => i.status === 'MISSING').length
        cats.push({
          id:    r.category_id,
          name:  r.category_name,
          total: catItems.length,
          covered, partial, missing,
          pct:   catItems.length ? Math.round((covered / catItems.length) * 100) : 0,
        })
      }
    })
    return cats
  }, [nc3Results, allItems])

  const activeCatId = activeCategory || (categories[0]?.id ?? null)

  // Filtered items
  const visibleItems = useMemo(() => {
    let items = activeCatId ? allItems.filter(i => i.category_id === activeCatId) : allItems
    if (statusFilter !== 'ALL')  items = items.filter(i => i.status === statusFilter)
    if (showMandatory)            items = items.filter(i => i.mandatory)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.topic.toLowerCase().includes(q) ||
        (i.evidence || '').toLowerCase().includes(q) ||
        (i.gap || '').toLowerCase().includes(q)
      )
    }
    return [...items].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  }, [allItems, activeCatId, statusFilter, showMandatory, search])

  // Stats for active category
  const activeCat    = categories.find(c => c.id === activeCatId)
  const covered  = visibleItems.filter(i => i.status === 'COVERED').length
  const partial  = visibleItems.filter(i => i.status === 'PARTIAL').length
  const missing  = visibleItems.filter(i => i.status === 'MISSING').length

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
          Proposal Checklist Coverage — All Categories
        </h3>
        <p className="text-xs text-gray-500">
          {allItems.length} items across {categories.length} categories
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex overflow-x-auto border-b border-gray-800 bg-gray-950/30" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => {
          const isActive = cat.id === activeCatId
          const statusColor = cat.pct >= 70 ? 'text-green-400' : cat.pct >= 50 ? 'text-yellow-400' : 'text-red-400'
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={clsx(
                'flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                isActive
                  ? 'border-blue-500 text-white bg-blue-950/20'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
              )}
            >
              <div>{cat.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="h-1 w-12 bg-gray-800 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full', cat.pct >= 70 ? 'bg-green-500' : cat.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                    style={{ width: `${cat.pct}%` }} />
                </div>
                <span className={clsx('text-[10px] font-mono', statusColor)}>{cat.pct}%</span>
                <span className="text-[10px] text-gray-600">({cat.total})</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/20 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <Search size={12} className="text-gray-600 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-1">
          {['ALL', 'COVERED', 'PARTIAL', 'MISSING'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-all border',
                statusFilter === s
                  ? s === 'COVERED' ? 'bg-green-950 text-green-300 border-green-800'
                  : s === 'PARTIAL' ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                  : s === 'MISSING' ? 'bg-red-950 text-red-300 border-red-800'
                  : 'bg-blue-950 text-blue-300 border-blue-800'
                  : 'text-gray-600 border-gray-800 hover:border-gray-600 hover:text-gray-400'
              )}>
              {s}
            </button>
          ))}
        </div>
        {/* Mandatory toggle */}
        <button onClick={() => setShowMandatory(v => !v)}
          className={clsx('px-2 py-0.5 rounded text-[10px] font-medium border transition-all',
            showMandatory ? 'bg-orange-950 text-orange-300 border-orange-800' : 'text-gray-600 border-gray-800 hover:border-gray-600')}>
          High-weight only
        </button>
      </div>

      {/* Progress summary */}
      {activeCat && (
        <div className="px-5 py-3 border-b border-gray-800/50 flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar covered={activeCat.covered} partial={activeCat.partial} missing={activeCat.missing} total={activeCat.total} />
          </div>
          <div className="flex gap-3 text-[11px] flex-shrink-0">
            <span className="text-green-400">✓ {activeCat.covered} covered</span>
            {activeCat.partial > 0 && <span className="text-yellow-400">~ {activeCat.partial} partial</span>}
            <span className="text-red-400">✗ {activeCat.missing} missing</span>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/50">
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-24">ID</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Criterion</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-20">Mand.</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-24">Status</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Evidence / Gap</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, i) => (
              <tr key={`${item.category_id}-${item.id}`}
                className={clsx('border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors', i % 2 === 0 && 'bg-gray-950/10')}>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{item.id}</td>
                <td className="px-4 py-2.5 text-xs text-gray-300 max-w-xs">{item.topic}</td>
                <td className="px-4 py-2.5 text-xs text-center">
                  {item.mandatory ? <span className="text-orange-400 font-bold">●</span> : <span className="text-gray-700">○</span>}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-2.5 text-[11px] max-w-sm">
                  {item.status === 'COVERED' && item.evidence && (
                    <span className="text-gray-400 italic">{item.evidence}</span>
                  )}
                  {item.status === 'MISSING' && item.gap && (
                    <span className="text-red-300">{item.gap}</span>
                  )}
                  {item.status === 'PARTIAL' && (
                    <span className="text-yellow-300">{item.gap || item.evidence || 'Partially addressed'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleItems.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-600">No items match the selected filters.</div>
        )}
      </div>
    </div>
  )
}
