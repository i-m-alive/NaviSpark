import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { CheckSquare, Square, ChevronDown, Download, AlertCircle, CheckCircle2, Flag, Bookmark, Info, Users, RotateCcw } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS = [
  {
    key:     'must_fix',
    label:   'Must Fix Before Sending',
    short:   'Critical',
    color:   'red',
    borderCls: 'border-red-900/50',
    headCls:   'bg-red-950/50 text-red-300 border-b-red-800/60',
    dotCls:    'bg-red-500',
    badgeCls:  'bg-red-900/60 text-red-300 border-red-700',
    Icon:    AlertCircle,
    iconCls: 'text-red-400',
    desc:    'These issues must be resolved. Submitting without fixing them risks rejection.',
  },
  {
    key:     'should_fix',
    label:   'Should Fix If Time Allows',
    short:   'Important',
    color:   'yellow',
    borderCls: 'border-yellow-900/40',
    headCls:   'bg-yellow-950/40 text-yellow-300 border-b-yellow-800/50',
    dotCls:    'bg-yellow-500',
    badgeCls:  'bg-yellow-900/60 text-yellow-300 border-yellow-700',
    Icon:    Flag,
    iconCls: 'text-yellow-400',
    desc:    'These improvements will strengthen the proposal and increase win probability.',
  },
  {
    key:     'next_time',
    label:   'Note for Next Proposal',
    short:   'Next Time',
    color:   'blue',
    borderCls: 'border-blue-900/40',
    headCls:   'bg-blue-950/40 text-blue-300 border-b-blue-800/50',
    dotCls:    'bg-blue-500',
    badgeCls:  'bg-blue-900/60 text-blue-300 border-blue-700',
    Icon:    Bookmark,
    iconCls: 'text-blue-400',
    desc:    'Not urgent for this submission — but save these learnings for the next proposal.',
  },
  {
    key:     'internal',
    label:   'Internal Readiness Only',
    short:   'Internal',
    color:   'gray',
    borderCls: 'border-gray-700/40',
    headCls:   'bg-gray-800/50 text-gray-300 border-b-gray-700/50',
    dotCls:    'bg-gray-500',
    badgeCls:  'bg-gray-800 text-gray-300 border-gray-700',
    Icon:    Info,
    iconCls: 'text-gray-400',
    desc:    'Internal team items — not visible to the client but important for delivery confidence.',
  },
]

const AGENT_COLORS = {
  'Agent 1': 'bg-indigo-950/60 text-indigo-400 border-indigo-800',
  'Agent 2': 'bg-purple-950/60 text-purple-400 border-purple-800',
  'Agent 3': 'bg-teal-950/60 text-teal-400 border-teal-800',
  'Agent 4': 'bg-orange-950/60 text-orange-400 border-orange-800',
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportCSV(allItems, sessionFilename) {
  const headers = ['Priority', 'Action', 'Why', 'Source Agents', 'Status']
  const rows = allItems.map(item => [
    item.tierLabel,
    `"${(item.action || '').replace(/"/g, '""')}"`,
    `"${(item.why    || '').replace(/"/g, '""')}"`,
    (item.source_agents || []).join('; '),
    item.checked ? 'Done' : 'Pending',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `action_plan_${(sessionFilename || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Individual action item ─────────────────────────────────────────────────────

function ActionItem({ item, checked, onToggle, tierColor, dotCls }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = item.why || (item.source_agents && item.source_agents.length > 0)

  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200',
        checked ? 'border-gray-800/50 opacity-60' : 'border-gray-800 hover:border-gray-700',
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 mt-0.5 text-gray-500 hover:text-white transition-colors"
          aria-label={checked ? 'Mark as pending' : 'Mark as done'}
        >
          {checked
            ? <CheckSquare size={16} className="text-green-400" />
            : <Square size={16} />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm text-gray-200 leading-snug', checked && 'line-through text-gray-500')}>
            {item.action}
          </p>

          {/* Source agents (always visible) */}
          {item.source_agents?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.source_agents.map(a => (
                <span key={a} className={clsx('text-[9px] font-mono px-1.5 py-0.5 rounded border', AGENT_COLORS[a] || 'bg-gray-800 text-gray-500 border-gray-700')}>
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Expandable why */}
          {item.why && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              <ChevronDown size={10} className={clsx('transition-transform duration-150', expanded && 'rotate-180')} />
              {expanded ? 'Hide reason' : 'Why this matters'}
            </button>
          )}
          {expanded && item.why && (
            <div className="mt-2 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 animate-slide-down">
              <p className="text-xs text-gray-400 leading-relaxed">
                <span className="text-gray-600 mr-1">Why:</span>
                {item.why}
              </p>
            </div>
          )}
        </div>

        {/* Status badge */}
        {checked && (
          <div className="flex-shrink-0">
            <CheckCircle2 size={14} className="text-green-500" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tier section ──────────────────────────────────────────────────────────────

function TierSection({ tier, items, checked, onToggle }) {
  const [collapsed, setCollapsed] = useState(false)
  const doneCount  = items.filter(i => checked.has(i.id)).length
  const totalCount = items.length
  const allDone    = totalCount > 0 && doneCount === totalCount

  return (
    <div
      className={clsx('rounded-xl border overflow-hidden', tier.borderCls)}
      style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Section header */}
      <div
        className={clsx('flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 cursor-pointer border-b select-none', tier.headCls)}
        onClick={() => setCollapsed(c => !c)}
      >
        <tier.Icon size={14} className={tier.iconCls} />
        <div className="flex-1">
          <span className="text-sm font-semibold">{tier.label}</span>
          <span className="text-[10px] ml-2 opacity-60">{tier.desc}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-xs font-mono px-2 py-0.5 rounded-full border', tier.badgeCls)}>
            {doneCount}/{totalCount}
          </span>
          {allDone && totalCount > 0 && (
            <CheckCircle2 size={14} className="text-green-400" />
          )}
          <ChevronDown size={14} className={clsx('text-gray-500 transition-transform duration-200 ml-1', collapsed && '-rotate-90')} />
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1 bg-gray-800">
          <div
            className={clsx('h-full transition-all duration-500', {
              'bg-green-500': tier.color === 'red',
              'bg-yellow-500': tier.color === 'yellow',
              'bg-blue-500': tier.color === 'blue',
              'bg-gray-500': tier.color === 'gray',
            })}
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-gray-600 italic px-1 py-2">No items in this tier.</p>
          ) : (
            items.map(item => (
              <ActionItem
                key={item.id}
                item={item}
                checked={checked.has(item.id)}
                onToggle={() => onToggle(item.id)}
                tierColor={tier.color}
                dotCls={tier.dotCls}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Readiness banner ──────────────────────────────────────────────────────────

function ReadinessBanner({ criticalTotal, criticalDone, totalDone, totalItems }) {
  const criticalAllDone = criticalTotal === 0 || criticalDone === criticalTotal
  const overallPct      = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-5 transition-all duration-500',
        criticalAllDone
          ? 'bg-green-950/40 border-green-800/60'
          : 'bg-gray-900 border-gray-800',
      )}
      style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Icon */}
      <div className={clsx(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500',
        criticalAllDone ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700',
      )}>
        {criticalAllDone
          ? <CheckCircle2 size={22} className="text-green-400" />
          : <AlertCircle  size={22} className="text-gray-500" />
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-bold', criticalAllDone ? 'text-green-300' : 'text-white')}>
          {criticalAllDone
            ? criticalTotal === 0
              ? 'No critical issues — ready to submit!'
              : 'All critical issues addressed — ready to submit!'
            : `${criticalTotal - criticalDone} critical issue${(criticalTotal - criticalDone) > 1 ? 's' : ''} still need${(criticalTotal - criticalDone) === 1 ? 's' : ''} fixing`
          }
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {totalDone} of {totalItems} total actions completed ({overallPct}%)
        </p>
      </div>

      {/* Overall progress ring */}
      <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="18" fill="none" stroke="#1f2937" strokeWidth="5" />
          <circle
            cx="24" cy="24" r="18"
            fill="none"
            stroke={criticalAllDone ? '#34d399' : '#6366f1'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 18}`}
            strokeDashoffset={`${2 * Math.PI * 18 * (1 - overallPct / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-white">{overallPct}%</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ActionPlanView({ output, session }) {
  const sessionId = session?.id || 'unknown'
  const storageKey = `navispark_plan_${sessionId}`

  // Build flat item list from priority_actions
  const allItems = []
  if (output?.priority_actions) {
    TIERS.forEach(tier => {
      const tierItems = output.priority_actions[tier.key] || []
      tierItems.forEach((item, i) => {
        allItems.push({
          ...item,
          id:        `${tier.key}_${i}`,
          tier:      tier.key,
          tierLabel: tier.short,
        })
      })
    })
  }

  // Checked state — loaded from localStorage
  const [checked, setChecked] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Persist to localStorage whenever checked changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...checked]))
    } catch { /* ignore */ }
  }, [checked, storageKey])

  const handleToggle = useCallback((id) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleReset = () => {
    if (window.confirm('Reset all checkboxes to unchecked?')) {
      setChecked(new Set())
    }
  }

  // Stats
  const criticalItems  = allItems.filter(i => i.tier === 'must_fix')
  const criticalDone   = criticalItems.filter(i => checked.has(i.id)).length
  const totalDone      = allItems.filter(i => checked.has(i.id)).length
  const totalItems     = allItems.length

  if (!output?.priority_actions) {
    return <p className="text-gray-500 text-sm py-8 text-center">No priority actions available.</p>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">

      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div>
          <h2 className="text-lg font-bold text-white">Action Plan</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Check off each item as you address it — progress is saved automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(allItems.map(i => ({ ...i, checked: checked.has(i.id) })), session?.original_filename)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-lg transition-colors hover:bg-gray-800"
            title="Reset all checkboxes"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Readiness banner */}
      <ReadinessBanner
        criticalTotal={criticalItems.length}
        criticalDone={criticalDone}
        totalDone={totalDone}
        totalItems={totalItems}
      />

      {/* Tier sections */}
      {TIERS.map(tier => {
        const tierItems = allItems.filter(i => i.tier === tier.key)
        return (
          <TierSection
            key={tier.key}
            tier={tier}
            items={tierItems}
            checked={checked}
            onToggle={handleToggle}
          />
        )
      })}

      {/* Double-flagged callout */}
      {output.double_flagged_issues?.length > 0 && (
        <div
          className="rounded-xl border border-red-900/50 bg-red-950/25 p-4"
          style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={13} className="text-red-400" />
            <p className="text-xs font-semibold text-red-300 uppercase tracking-wider">
              Double-Flagged — Flagged by Multiple Agents ({output.double_flagged_issues.length})
            </p>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            These issues were independently identified by two or more specialist agents.
            They are already included in the "Must Fix" list above but are highlighted here for emphasis.
          </p>
          <ul className="space-y-2">
            {output.double_flagged_issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="text-red-500 flex-shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                <span className="leading-snug">{issue.issue_summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-white mb-1">No action items found</p>
          <p className="text-sm text-gray-500">All checks passed — this proposal is ready to submit.</p>
        </div>
      )}
    </div>
  )
}
