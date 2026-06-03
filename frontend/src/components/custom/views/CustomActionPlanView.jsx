import { clsx } from 'clsx'
import { XCircle, AlertTriangle, Clock, CheckSquare } from 'lucide-react'

const TIER_CONFIG = {
  must_fix:   { label: 'Must Fix',   Icon: XCircle,       color: 'text-red-300',    bg: 'bg-red-950/30 border-red-900/40',     dot: 'bg-red-500' },
  should_fix: { label: 'Should Fix', Icon: AlertTriangle, color: 'text-yellow-300', bg: 'bg-yellow-950/30 border-yellow-900/40', dot: 'bg-yellow-500' },
  next_time:  { label: 'Next Time',  Icon: Clock,         color: 'text-blue-300',   bg: 'bg-blue-950/30 border-blue-900/40',   dot: 'bg-blue-500' },
}

function ActionItem({ item, index }) {
  const text = typeof item === 'string' ? item
    : item.action || item.description || item.gap || item.text || JSON.stringify(item)
  const category = typeof item === 'object' && (item.category || item.category_name)
  const itemId = typeof item === 'object' && item.item_id
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800/50 last:border-0">
      <span className="text-[10px] font-mono text-gray-600 mt-0.5 flex-shrink-0 w-5">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">{text}</p>
        {(category || itemId) && (
          <div className="flex gap-2 mt-1.5">
            {category && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">{category}</span>
            )}
            {itemId && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded font-mono">{itemId}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CustomActionPlanView({ output }) {
  if (!output) return null

  const { priority_actions = {}, checklist_coverage = {}, overall_score = 0 } = output
  const { must_fix = [], should_fix = [], next_time = [] } = priority_actions
  const { total_items = 0, passed = 0, failed = 0 } = checklist_coverage
  const totalActions = must_fix.length + should_fix.length + next_time.length

  return (
    <div className="space-y-5" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalActions}</div>
          <div className="text-xs text-gray-500 mt-1">Total Actions</div>
        </div>
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{must_fix.length}</div>
          <div className="text-xs text-gray-500 mt-1">Must Fix</div>
        </div>
        <div className="bg-yellow-950/30 border border-yellow-900/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{should_fix.length}</div>
          <div className="text-xs text-gray-500 mt-1">Should Fix</div>
        </div>
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{next_time.length}</div>
          <div className="text-xs text-gray-500 mt-1">Next Time</div>
        </div>
      </div>

      {/* Action tiers */}
      {(['must_fix', 'should_fix', 'next_time']).map((tier) => {
        const items = priority_actions[tier] || []
        if (items.length === 0) return null
        const cfg = TIER_CONFIG[tier]
        return (
          <div key={tier} className={clsx('border rounded-xl overflow-hidden', cfg.bg)}>
            <div className={clsx('flex items-center gap-2 px-5 py-3.5 border-b border-gray-800/50')}>
              <cfg.Icon size={14} className={cfg.color} />
              <h3 className={clsx('text-xs font-semibold uppercase tracking-wider', cfg.color)}>
                {cfg.label} ({items.length})
              </h3>
            </div>
            <div className="px-5 bg-gray-950/30">
              {items.map((item, i) => (
                <ActionItem key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        )
      })}

      {totalActions === 0 && (
        <div className="bg-green-950/30 border border-green-900/40 rounded-xl p-8 text-center">
          <CheckSquare size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No action items</p>
          <p className="text-xs text-gray-400 mt-1">The proposal meets all checklist criteria.</p>
        </div>
      )}
    </div>
  )
}
