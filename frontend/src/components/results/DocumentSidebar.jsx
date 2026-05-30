import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  CheckCircle2, Loader2, AlertCircle, Clock,
  BarChart3, FileText, ChevronRight, Upload, Trash2, X, Check,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreHex(score) {
  if (score == null) return '#4b5563'
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

function verdictShort(verdict) {
  if (!verdict) return null
  if (verdict === 'READY TO SEND')                              return { text: 'Ready',         cls: 'text-green-400' }
  if (verdict === 'REVISE BEFORE SENDING')                      return { text: 'Revise',         cls: 'text-yellow-400' }
  if (verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND') return { text: 'Major revision', cls: 'text-red-400' }
  return { text: verdict, cls: 'text-gray-400' }
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Tiny score ring ───────────────────────────────────────────────────────────

function MiniRing({ score, size = 40 }) {
  const r     = size * 0.38
  const circ  = 2 * Math.PI * r
  const pct   = score != null ? Math.min(100, (score / 10) * 100) : 0
  const color = scoreHex(score)
  const cx    = size / 2

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1f2937" strokeWidth={size * 0.13} />
        {score != null && (
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke={color} strokeWidth={size * 0.13} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {score != null
          ? <span className="font-mono font-bold" style={{ fontSize: size * 0.22, color }}>{score.toFixed(1)}</span>
          : <span className="text-gray-700" style={{ fontSize: size * 0.18 }}>—</span>
        }
      </div>
    </div>
  )
}

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  if (status === 'complete')
    return <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
  if (status === 'pipeline_failed')
    return <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
  if (status === 'pipeline_running' || status === 'agents_complete')
    return <Loader2 size={11} className="text-blue-400 animate-spin flex-shrink-0" />
  return <Clock size={11} className="text-gray-600 flex-shrink-0" />
}

// ── Individual version card ───────────────────────────────────────────────────

function VersionCard({ version, isCurrent, onClick, onDelete, deleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const score   = version.agent4_output?.overall_score
  const verdict = verdictShort(version.agent4_output?.verdict)
  const name    = version.original_filename || 'Untitled'
  const nameTruncated = name.length > 22 ? name.slice(0, 19) + '…' : name

  function handleDeleteClick(e) {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  function handleConfirm(e) {
    e.stopPropagation()
    setConfirmDelete(false)
    onDelete(version.id)
  }

  function handleCancel(e) {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <div
      className={clsx(
        'relative group rounded-xl border transition-all duration-150 overflow-hidden',
        isCurrent
          ? 'bg-blue-950/35 border-blue-800/60'
          : 'bg-gray-900/50 border-gray-800 hover:border-gray-600 hover:bg-gray-800/50',
      )}
    >
      {/* Main clickable area */}
      <button
        onClick={onClick}
        disabled={isCurrent}
        className="w-full flex items-start gap-2.5 px-3 py-3 text-left"
      >
        {/* Score ring */}
        <MiniRing score={score} size={38} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={clsx(
              'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0',
              isCurrent
                ? 'bg-blue-950 text-blue-300 border-blue-800'
                : 'bg-gray-800 text-gray-400 border-gray-700',
            )}>
              V{version.version_number}
            </span>
            {isCurrent && (
              <span className="text-[8px] text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1 rounded-full">
                viewing
              </span>
            )}
            <StatusDot status={version.status} />
          </div>

          <p className="text-[11px] text-gray-200 font-medium leading-snug truncate pr-6">
            {nameTruncated}
          </p>

          {verdict && (
            <p className={clsx('text-[10px] mt-0.5', verdict.cls)}>{verdict.text}</p>
          )}

          <p className="text-[9px] text-gray-600 mt-0.5">{timeAgo(version.created_at)}</p>
        </div>

        {!isCurrent && !confirmDelete && (
          <ChevronRight size={12} className="text-gray-600 flex-shrink-0 mt-2" />
        )}
      </button>

      {/* Delete button — appears on hover (top-right corner) */}
      {!confirmDelete && !deleting && (
        <button
          onClick={handleDeleteClick}
          title="Delete this document"
          className={clsx(
            'absolute top-2 right-2 p-1 rounded-md transition-all duration-150',
            'text-gray-700 hover:text-red-400 hover:bg-red-950/40',
            'opacity-0 group-hover:opacity-100',
          )}
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Deletion in progress */}
      {deleting && (
        <div className="absolute top-2 right-2 p-1">
          <Loader2 size={11} className="text-red-400 animate-spin" />
        </div>
      )}

      {/* Inline confirm strip */}
      {confirmDelete && (
        <div
          className="flex items-center justify-between px-3 py-2 bg-red-950/40 border-t border-red-900/40"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] text-red-300">Delete this document?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCancel}
              className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
              title="Cancel"
            >
              <X size={11} />
            </button>
            <button
              onClick={handleConfirm}
              className="p-1 rounded text-red-400 hover:text-white hover:bg-red-700 transition-colors"
              title="Confirm delete"
            >
              <Check size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function DocumentSidebar({
  versions,             // [{id, version_number, status, agent4_output, ...}]
  currentSessionId,     // currently viewed session
  sidebarMode,          // 'report' | 'compare_all'
  onCompareDashboard,   // () => void — switch to compare mode
  onReportMode,         // () => void — switch back to report mode
  currentSession,       // full session object for "upload" quick action
  onDeleteVersion,      // (sessionId: string) => void — called when user confirms delete
}) {
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState(null)

  // If history hasn't loaded yet, show a placeholder with the current session
  const list = versions.length > 0 ? versions : currentSession ? [{
    id:               currentSession.id,
    version_number:   currentSession.version_number || 1,
    status:           currentSession.status,
    original_filename: currentSession.original_filename,
    created_at:       currentSession.created_at,
    agent4_output:    currentSession.agent4_output,
  }] : []

  const canCompare = list.filter(v => v.status === 'complete' && v.agent4_output).length >= 2

  async function handleDelete(sessionId) {
    setDeletingId(sessionId)
    try {
      await onDeleteVersion(sessionId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-gray-500" />
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Documents</span>
        </div>
        <p className="text-[10px] text-gray-700 mt-0.5">{list.length} version{list.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {list.map(v => (
          <VersionCard
            key={v.id}
            version={v}
            isCurrent={v.id === currentSessionId && sidebarMode === 'report'}
            deleting={deletingId === v.id}
            onClick={() => {
              if (v.id !== currentSessionId) {
                navigate(`/results/${v.id}`)
              } else if (sidebarMode !== 'report') {
                onReportMode()
              }
            }}
            onDelete={handleDelete}
          />
        ))}

        {/* Loading placeholder when history is being fetched */}
        {list.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="text-gray-700 animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-800 space-y-2">

        {/* Compare All button */}
        <button
          onClick={sidebarMode === 'compare_all' ? onReportMode : onCompareDashboard}
          disabled={!canCompare}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200',
            sidebarMode === 'compare_all'
              ? 'bg-violet-950/50 border-violet-700/60 text-violet-300'
              : canCompare
              ? 'bg-gray-900 border-gray-700 text-gray-300 hover:border-violet-700/50 hover:text-violet-300 hover:bg-violet-950/20'
              : 'bg-gray-900/40 border-gray-800 text-gray-600 cursor-not-allowed',
          )}
        >
          <BarChart3 size={13} className={sidebarMode === 'compare_all' ? 'text-violet-400' : canCompare ? '' : 'text-gray-700'} />
          <span>{sidebarMode === 'compare_all' ? 'Back to Report' : 'Compare All Versions'}</span>
          {!canCompare && (
            <span className="ml-auto text-[9px] text-gray-700">Need 2+ complete</span>
          )}
        </button>

        {/* Quick upload link (only when viewing a complete session in report mode) */}
        {currentSession?.status === 'complete' && sidebarMode === 'report' && (
          <button
            onClick={() => {
              // Scroll to the upload panel at the bottom of the main column
              document.getElementById('upload-revision-panel')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-700 text-xs text-gray-500 hover:border-blue-700/50 hover:text-blue-400 hover:bg-blue-950/15 transition-all duration-200"
          >
            <Upload size={12} />
            Upload Improved Version
          </button>
        )}
      </div>
    </div>
  )
}
