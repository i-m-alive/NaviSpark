import { useState } from 'react'
import { clsx } from 'clsx'
import {
  X, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  Wand2, SkipForward, Copy, Check, ListPlus, Plus, Replace,
  FileEdit,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  must_fix:     { label: 'Must Fix',     cls: 'bg-red-950/60 text-red-300 border-red-800/60' },
  should_fix:   { label: 'Should Fix',   cls: 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60' },
  nice_to_have: { label: 'Nice to Have', cls: 'bg-gray-800 text-gray-400 border-gray-700' },
}

const SEVERITY_STYLES = {
  CRITICAL: 'text-red-400',
  MAJOR:    'text-yellow-400',
  MINOR:    'text-gray-400',
}

const ACTION_META = {
  replace_text:   { icon: Replace,  label: 'Replace text'  },
  append_bullets: { icon: ListPlus, label: 'Add bullets'   },
  append_text:    { icon: Plus,     label: 'Append text'   },
}

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.nice_to_have
  return (
    <span className={clsx('text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border', s.cls)}>
      {s.label}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border transition-all
        border-gray-700 text-gray-500 hover:text-white hover:border-gray-500"
    >
      {copied ? <Check size={9} className="text-green-400" /> : <Copy size={9} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ── Individual change card ─────────────────────────────────────────────────────

function ChangeCard({ item, index }) {
  const [open, setOpen] = useState(index < 3)
  const actionMeta = ACTION_META[item.action] || ACTION_META.replace_text
  const ActionIcon = actionMeta.icon
  const sev = SEVERITY_STYLES[item.severity] || 'text-gray-400'

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 bg-gray-900/60 hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-mono text-gray-400 mt-0.5">
          {item.change_number}
        </span>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Location */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-white">Slide {item.slide_number}</span>
            <span className="text-gray-600 text-[10px]">—</span>
            <span className="text-[11px] text-gray-300 truncate max-w-[200px]">{item.slide_title}</span>
          </div>
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={item.priority} />
            <span className={clsx('text-[9px] font-mono font-semibold', sev)}>{item.severity}</span>
            <span className="flex items-center gap-1 text-[9px] text-gray-400">
              <ActionIcon size={9} />{actionMeta.label}
            </span>
          </div>
        </div>

        <span className="flex-shrink-0 text-gray-600 mt-1">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 space-y-3 border-t border-gray-800 bg-gray-950/40">

          {/* Why — Agent 4 issue it fixes */}
          {item.addresses_finding && (
            <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 p-2.5">
              <p className="text-[8px] font-mono text-purple-400 uppercase tracking-wider mb-1">
                Agent 4 action-plan issue this fixes
              </p>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                {item.addresses_finding}
              </p>
            </div>
          )}

          {/* Where — shape location hint */}
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-medium mb-1">
              Location in slide
            </p>
            <p className="text-[10px] font-mono text-gray-400 bg-gray-800/60 px-2 py-1 rounded">
              {item.shape_name || '(body text area)'}
            </p>
          </div>

          {/* replace_text instructions */}
          {item.action === 'replace_text' && (
            <div className="space-y-2">
              {/* Find */}
              {item.find_text && (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[8px] font-mono text-red-400 uppercase tracking-wider">
                      1. Find this text in your PPT
                    </p>
                    <CopyButton text={item.find_text} />
                  </div>
                  <p className="text-[11px] text-red-200/80 leading-relaxed italic">
                    "{item.find_text}"
                  </p>
                </div>
              )}
              {/* Replace with */}
              {item.replace_with && (
                <div className="rounded-lg border border-green-900/40 bg-green-950/20 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[8px] font-mono text-green-400 uppercase tracking-wider">
                      2. Replace with
                    </p>
                    <CopyButton text={item.replace_with} />
                  </div>
                  <p className="text-[11px] text-green-200/80 leading-relaxed">
                    "{item.replace_with}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* append_bullets instructions */}
          {item.action === 'append_bullets' && item.bullets_to_add?.length > 0 && (
            <div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[8px] font-mono text-blue-400 uppercase tracking-wider">
                  Add these bullet points at end of section
                </p>
                <CopyButton text={item.bullets_to_add.map(b => `• ${b}`).join('\n')} />
              </div>
              <ul className="space-y-1">
                {item.bullets_to_add.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-blue-200/80">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* append_text instructions */}
          {item.action === 'append_text' && item.replace_with && (
            <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] font-mono text-purple-400 uppercase tracking-wider">
                  Add this text at end of section
                </p>
                <CopyButton text={item.replace_with} />
              </div>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                "{item.replace_with}"
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Skipped card ──────────────────────────────────────────────────────────────

function SkippedCard({ item }) {
  return (
    <div className="border border-gray-800 rounded-xl px-4 py-3 bg-gray-900/40 space-y-1.5">
      <div className="flex items-start gap-2">
        <SkipForward size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[11px] text-gray-300 font-medium leading-snug">
            {item.finding || 'Unnamed finding'}
          </p>
          <p className="text-[10px] text-gray-500">
            <span className="text-gray-600">Reason: </span>{item.reason}
          </p>
          {item.manual_action_required && (
            <p className="text-[10px] text-yellow-500/80">
              <span className="text-yellow-600 font-semibold">Manual action: </span>
              {item.manual_action_required}
            </p>
          )}
          {item.source_agent && (
            <span className="text-[9px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
              {item.source_agent}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ModificationReportPanel({ result, onClose }) {
  const [tab, setTab] = useState('guide')

  if (!result) return null

  const { guide = [], skipped = [], summary = {} } = result

  const mustFix   = guide.filter(c => c.priority === 'must_fix')
  const shouldFix = guide.filter(c => c.priority === 'should_fix')
  const niceFix   = guide.filter(c => c.priority === 'nice_to_have')

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="flex-1" onClick={onClose} />

      <div
        className="w-full max-w-lg h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden"
        style={{ animation: 'slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1) both' }}
      >

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="p-2 bg-purple-950/60 rounded-lg border border-purple-800/40">
            <FileEdit size={15} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">PPT Edit Guide</h2>
            <p className="text-[10px] text-gray-500">Copy-paste fixes — Agent 5 analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Summary stats */}
        <div className="px-5 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Must Fix',     value: summary.must_fix   ?? mustFix.length,   cls: 'text-red-400'    },
              { label: 'Should Fix',   value: summary.should_fix ?? shouldFix.length, cls: 'text-yellow-400' },
              { label: 'Nice to Have', value: summary.nice_to_have ?? niceFix.length, cls: 'text-gray-300'   },
              { label: 'Skipped',      value: summary.skipped    ?? skipped.length,   cls: 'text-gray-500'   },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-gray-900/60 rounded-lg px-2 py-2 text-center border border-gray-800">
                <p className={clsx('text-lg font-mono font-bold', cls)}>{value}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {summary.must_fix_coverage && (
            <p className="text-[10px] text-gray-500 mt-2">
              Coverage: {summary.must_fix_coverage}
            </p>
          )}
        </div>

        {/* How-to tip */}
        <div className="px-5 py-2.5 border-b border-gray-800 bg-blue-950/20 flex-shrink-0">
          <p className="text-[10px] text-blue-300/80 leading-relaxed">
            Each card below shows <strong>where</strong> to edit in your PPT,{' '}
            <strong>what text to find</strong>, and <strong>what to replace it with</strong>.
            Use the <span className="font-mono bg-gray-800 px-1 rounded">Copy</span> buttons
            to paste directly into PowerPoint.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {[
            { key: 'guide',   label: `Edits to Make (${guide.length})`   },
            { key: 'skipped', label: `Skipped (${skipped.length})`        },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex-1 py-2.5 text-xs font-medium transition-colors',
                tab === t.key
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-500 hover:text-gray-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {tab === 'guide' && (
            <>
              {guide.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle size={24} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No edits were generated.</p>
                  <p className="text-xs text-gray-600 mt-1">Check the Skipped tab for details.</p>
                </div>
              ) : (
                <>
                  {mustFix.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest px-1">
                        Must Fix — {mustFix.length} edit{mustFix.length !== 1 ? 's' : ''}
                      </p>
                      {mustFix.map((c, i) => <ChangeCard key={c.change_number} item={c} index={i} />)}
                    </div>
                  )}

                  {shouldFix.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest px-1">
                        Should Fix — {shouldFix.length} edit{shouldFix.length !== 1 ? 's' : ''}
                      </p>
                      {shouldFix.map((c, i) => <ChangeCard key={c.change_number} item={c} index={i} />)}
                    </div>
                  )}

                  {niceFix.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest px-1">
                        Nice to Have — {niceFix.length} edit{niceFix.length !== 1 ? 's' : ''}
                      </p>
                      {niceFix.map((c, i) => <ChangeCard key={c.change_number} item={c} index={i} />)}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'skipped' && (
            <>
              {skipped.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={24} className="text-green-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">All findings were addressed.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 px-1 mb-3">
                    These findings could not be auto-converted to edits and need manual review.
                  </p>
                  {skipped.map((item, i) => <SkippedCard key={i} item={item} />)}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
