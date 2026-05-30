import { useState, useMemo } from 'react'

const SHEET_ORDER = ['Proposal', 'Estimation', 'Pricing']

const STATUS_CONFIG = {
  COVERED: { badge: 'bg-green-900 text-green-300 border-green-700', icon: '✓', bar: 'bg-green-500', chip: 'bg-green-950/70 text-green-300 border-green-700 hover:border-green-500', chipActive: 'bg-green-700/40 text-green-200 border-green-500' },
  PARTIAL:  { badge: 'bg-yellow-900 text-yellow-300 border-yellow-700', icon: '~', bar: 'bg-yellow-500', chip: 'bg-yellow-950/70 text-yellow-300 border-yellow-700 hover:border-yellow-500', chipActive: 'bg-yellow-700/40 text-yellow-200 border-yellow-500' },
  MISSING:  { badge: 'bg-red-900 text-red-300 border-red-700', icon: '✕', bar: 'bg-red-500', chip: 'bg-red-950/70 text-red-300 border-red-700 hover:border-red-500', chipActive: 'bg-red-700/40 text-red-200 border-red-500' },
}

const AGENT_COLOUR = {
  A1: { text: 'text-indigo-400', chip: 'bg-indigo-950/70 text-indigo-300 border-indigo-700 hover:border-indigo-500', chipActive: 'bg-indigo-700/40 text-indigo-200 border-indigo-500' },
  A2: { text: 'text-purple-400', chip: 'bg-purple-950/70 text-purple-300 border-purple-700 hover:border-purple-500', chipActive: 'bg-purple-700/40 text-purple-200 border-purple-500' },
  A3: { text: 'text-teal-400',   chip: 'bg-teal-950/70 text-teal-300 border-teal-700 hover:border-teal-500',     chipActive: 'bg-teal-700/40 text-teal-200 border-teal-500'     },
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const total    = items.length || 1
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${(covered / total) * 100}%` }} />
        <div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${(partial / total) * 100}%` }} />
        <div className="bg-red-500 h-full transition-all duration-700"   style={{ width: `${(missing / total) * 100}%` }} />
      </div>
      <span className="text-gray-500 font-mono flex-shrink-0">{covered}/{total} covered</span>
    </div>
  )
}

// ── Toggleable filter chip ────────────────────────────────────────────────────

function FilterChip({ label, active, onClick, activeClass, idleClass, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all duration-150 ${
        active ? activeClass : idleClass
      }`}
    >
      {icon && <span className="text-[9px]">{icon}</span>}
      {label}
      {active && <span className="ml-0.5 text-[8px] opacity-60">✕</span>}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FullChecklistGrid({ checklistCoverage }) {
  const [activeSheet, setActiveSheet]       = useState('Proposal')
  const [showInternal, setShowInternal]     = useState(false)
  const [showFilters, setShowFilters]       = useState(false)
  const [statusFilter, setStatusFilter]     = useState([])   // [] = all
  const [agentFilter, setAgentFilter]       = useState([])   // [] = all
  const [mandatoryOnly, setMandatoryOnly]   = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')

  if (!checklistCoverage?.length) return null

  // ── Build sheet buckets ───────────────────────────────────────────────────
  const bySheet = useMemo(() => {
    const map = {}
    SHEET_ORDER.forEach(s => { map[s] = [] })
    checklistCoverage.forEach(item => {
      if (map[item.sheet]) map[item.sheet].push(item)
    })
    return map
  }, [checklistCoverage])

  // ── Derive available agents for current sheet ─────────────────────────────
  const sheetItems = bySheet[activeSheet] || []
  const availableAgents = useMemo(() => [...new Set(sheetItems.map(i => i.primary_agent).filter(Boolean))], [sheetItems])

  // ── Apply all filters ─────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return sheetItems
      .filter(i => showInternal || !i.internal)
      .filter(i => statusFilter.length === 0 || statusFilter.includes(i.status))
      .filter(i => agentFilter.length === 0  || agentFilter.includes(i.primary_agent))
      .filter(i => !mandatoryOnly || i.mandatory)
      .filter(i => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          (i.topic?.toLowerCase().includes(q)) ||
          (i.id?.toLowerCase().includes(q)) ||
          (i.note?.toLowerCase().includes(q))
        )
      })
  }, [sheetItems, showInternal, statusFilter, agentFilter, mandatoryOnly, searchQuery])

  // ── Overall counts (for header) ───────────────────────────────────────────
  const totalCovered = checklistCoverage.filter(i => i.status === 'COVERED').length
  const totalMissing = checklistCoverage.filter(i => i.status === 'MISSING').length
  const totalPartial = checklistCoverage.filter(i => i.status === 'PARTIAL').length

  // ── Helper: toggle a value in a string array ──────────────────────────────
  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  const hasActiveFilters = statusFilter.length > 0 || agentFilter.length > 0 || mandatoryOnly || searchQuery.trim()
  const activeFilterCount = statusFilter.length + agentFilter.length + (mandatoryOnly ? 1 : 0) + (searchQuery.trim() ? 1 : 0)

  const clearAllFilters = () => {
    setStatusFilter([])
    setAgentFilter([])
    setMandatoryOnly(false)
    setSearchQuery('')
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Proposal Checklist Coverage — All 3 Sheets
          </h3>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400 font-mono">{totalCovered} covered</span>
            <span className="text-yellow-400 font-mono">{totalPartial} partial</span>
            <span className="text-red-400 font-mono">{totalMissing} missing</span>
          </div>
        </div>

        {/* ── Sheet tabs + Internal toggle ──────────────────────────────── */}
        <div className="flex items-center gap-1 mt-3">
          {SHEET_ORDER.map(sheet => {
            const items = bySheet[sheet] || []
            const missingCount = items.filter(i => i.status === 'MISSING').length
            return (
              <button
                key={sheet}
                onClick={() => { setActiveSheet(sheet); setStatusFilter([]); setAgentFilter([]) }}
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

          <div className="ml-auto flex items-center gap-1.5">
            {/* Filter toggle button */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all duration-150 ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-950/60 text-blue-300 border-blue-700/60'
                  : 'text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <svg width="11" height="9" viewBox="0 0 11 9" fill="currentColor">
                <rect x="0" y="0" width="11" height="1.5" rx="0.75"/>
                <rect x="2" y="3.5" width="7" height="1.5" rx="0.75"/>
                <rect x="4" y="7" width="3" height="1.5" rx="0.75"/>
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Internal toggle */}
            <button
              onClick={() => setShowInternal(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border transition-colors ${
                showInternal
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'text-gray-600 border-gray-800 hover:text-gray-400'
              }`}
            >
              ⚠ Internal
            </button>
          </div>
        </div>

        {/* ── Filter panel ─────────────────────────────────────────────── */}
        {showFilters && (
          <div
            className="mt-3 pt-3 border-t border-gray-800 space-y-2.5"
            style={{ animation: 'slide-up-fade 0.18s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            {/* Search row */}
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8.2" y1="8.2" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by ID or topic…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-700/60 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs"
                >✕</button>
              )}
            </div>

            {/* Status + Agent + Mandatory row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status chips */}
              <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mr-0.5">Status</span>
              {['COVERED', 'PARTIAL', 'MISSING'].map(st => {
                const cfg = STATUS_CONFIG[st]
                const active = statusFilter.includes(st)
                return (
                  <FilterChip
                    key={st}
                    label={st.charAt(0) + st.slice(1).toLowerCase()}
                    active={active}
                    onClick={() => setStatusFilter(prev => toggle(prev, st))}
                    activeClass={cfg.chipActive + ' border'}
                    idleClass={cfg.chip + ' border'}
                    icon={cfg.icon}
                  />
                )
              })}

              <div className="w-px h-4 bg-gray-800 mx-0.5" />

              {/* Agent chips */}
              <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mr-0.5">Agent</span>
              {availableAgents.map(agent => {
                const cfg = AGENT_COLOUR[agent] || {}
                const active = agentFilter.includes(agent)
                return (
                  <FilterChip
                    key={agent}
                    label={agent}
                    active={active}
                    onClick={() => setAgentFilter(prev => toggle(prev, agent))}
                    activeClass={(cfg.chipActive || '') + ' border'}
                    idleClass={(cfg.chip || 'bg-gray-800/70 text-gray-400 border-gray-700 hover:border-gray-500') + ' border'}
                  />
                )
              })}

              <div className="w-px h-4 bg-gray-800 mx-0.5" />

              {/* Mandatory toggle */}
              <FilterChip
                label="Mandatory only"
                active={mandatoryOnly}
                onClick={() => setMandatoryOnly(v => !v)}
                activeClass="bg-indigo-950/60 text-indigo-300 border-indigo-700"
                idleClass="bg-gray-950/60 text-gray-500 border-gray-800 hover:border-gray-600 hover:text-gray-300"
                icon="★"
              />

              {/* Clear all */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="ml-auto text-[10px] text-gray-500 hover:text-red-400 px-2 py-1 rounded-lg border border-transparent hover:border-red-900/50 hover:bg-red-950/20 transition-all"
                >
                  Clear all ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Sheet progress bar ────────────────────────────────────────── */}
        <div className="mt-2">
          <SheetStats items={sheetItems} />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-600 font-mono font-normal px-4 py-2 w-16">ID</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2">
                Topic
                {/* Result count badge when filtered */}
                {hasActiveFilters && (
                  <span className="ml-2 text-[9px] text-blue-400 font-mono bg-blue-950/50 border border-blue-800/50 px-1.5 py-0.5 rounded-full">
                    {filteredItems.length} / {sheetItems.filter(i => showInternal || !i.internal).length} shown
                  </span>
                )}
              </th>
              <th className="text-center text-gray-600 font-normal px-3 py-2 w-20">Mandatory</th>
              <th className="text-center text-gray-600 font-normal px-3 py-2 w-28">Status</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2 w-16">Agent</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="text-gray-600 text-sm mb-1">No items match the current filters</div>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-blue-500 hover:text-blue-400 underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr
                  key={item.id}
                  className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/60 transition-colors group ${
                    item.internal ? 'opacity-70' : ''
                  }`}
                  title={item.note || ''}
                >
                  <td className="px-4 py-2.5 font-mono text-gray-500">{item.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {/* Highlight search match */}
                      <span className="text-gray-200">
                        {searchQuery.trim()
                          ? highlightMatch(item.topic, searchQuery)
                          : item.topic
                        }
                      </span>
                      {item.internal && (
                        <span className="text-[9px] font-mono text-amber-600 border border-amber-900 px-1 rounded flex-shrink-0">INTERNAL</span>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-gray-600 text-[10px] mt-0.5 leading-snug hidden group-hover:block max-w-xs truncate">
                        {item.note}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {item.mandatory
                      ? <span className="text-xs text-indigo-400">✓</span>
                      : <span className="text-xs text-gray-700">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className={`px-3 py-2.5 font-mono font-medium ${AGENT_COLOUR[item.primary_agent]?.text || 'text-gray-500'}`}>
                    {item.primary_agent}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Highlight matching substring in text ──────────────────────────────────────

function highlightMatch(text, query) {
  if (!text || !query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-400/25 text-yellow-200 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
