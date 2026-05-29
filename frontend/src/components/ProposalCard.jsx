import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Clock, ChevronRight, Download,
  Trash2, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react'
import { getReportUrl } from '../api/client'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  uploading:       { label: 'Uploading',    cls: 'bg-yellow-900 text-yellow-300 border-yellow-800' },
  ready:           { label: 'Ready',        cls: 'bg-blue-900 text-blue-300 border-blue-800' },
  agent1_complete: { label: 'Step 1 done',  cls: 'bg-indigo-900 text-indigo-300 border-indigo-800' },
  agent2_complete: { label: 'Step 2 done',  cls: 'bg-purple-900 text-purple-300 border-purple-800' },
  agent3_complete: { label: 'Step 3 done',  cls: 'bg-teal-900 text-teal-300 border-teal-800' },
  agents_complete: { label: 'Analysing',    cls: 'bg-teal-900 text-teal-300 border-teal-800' },
  complete:        { label: 'Complete',     cls: 'bg-green-900 text-green-300 border-green-800' },
  error:           { label: 'Error',        cls: 'bg-red-900 text-red-300 border-red-800' },
}

function StatusPill({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, cls: 'bg-gray-800 text-gray-400 border-gray-700' }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  if (!verdict) return null
  const map = {
    'READY TO SEND':         { cls: 'bg-green-900 text-green-300 border-green-700',   icon: <CheckCircle size={11} /> },
    'REVISE BEFORE SENDING': { cls: 'bg-yellow-900 text-yellow-300 border-yellow-700', icon: <AlertCircle size={11} /> },
    'DO NOT SEND':           { cls: 'bg-red-900 text-red-300 border-red-700',         icon: <AlertCircle size={11} /> },
  }
  const cfg = map[verdict]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.icon} {verdict}
    </span>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  if (score == null) return null
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  const r = 14
  const circ = 2 * Math.PI * r
  const colour = score >= 8 ? '#34d399' : score >= 5 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#1f2937" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke={colour}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="text-[9px] font-bold text-gray-400 -mt-7 relative z-10" style={{ position: 'relative', top: '-24px' }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function ProposalCard({ proposal, selected, onToggleSelect, onDelete, selectionMode }) {
  const [downloading, setDownloading] = useState(false)
  const hasReport = proposal.status === 'complete' && proposal.agent4_output
  const score = proposal.agent4_output?.overall_score

  const handleDownload = async (e) => {
    e.preventDefault()
    setDownloading(true)
    try {
      const { download_url } = await getReportUrl(proposal.id)
      window.open(download_url, '_blank')
    } catch (err) {
      alert('Could not get download link: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={`relative group rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer
        ${selected
          ? 'border-blue-600 bg-blue-950/30 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:shadow-lg hover:shadow-black/30'
        }
      `}
      onClick={() => selectionMode && onToggleSelect()}
    >
      {/* Top accent */}
      <div className={`h-0.5 w-full transition-all duration-200 ${
        proposal.status === 'complete'
          ? 'bg-gradient-to-r from-green-600 via-teal-500 to-blue-600'
          : proposal.status === 'ready'
          ? 'bg-gradient-to-r from-blue-700 to-blue-500'
          : 'bg-gradient-to-r from-gray-700 to-gray-600'
      }`} />

      <div className="p-4">
        {/* ── Row 1: icon + title + status + checkbox ────────────────────── */}
        <div className="flex items-start gap-3 mb-3">
          {/* Checkbox (always visible on hover or when something is selected) */}
          <div
            className={`flex-shrink-0 mt-0.5 transition-all duration-150 ${
              selectionMode || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={e => { e.stopPropagation(); onToggleSelect() }}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-600 hover:border-blue-500'
            }`}>
              {selected && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>

          {/* File icon */}
          <div className="flex-shrink-0 p-1.5 rounded-lg bg-gray-800 group-hover:bg-gray-750 transition-colors">
            <FileText size={16} className="text-blue-400" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-snug">
              {proposal.original_filename || 'Untitled Proposal'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock size={9} />
              {formatDate(proposal.created_at)}
            </p>
          </div>

          {/* Status + score */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusPill status={proposal.status} />
            {score != null && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">Score</span>
                <span className={`text-[11px] font-bold ${
                  score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>{score.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: meta tags ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {proposal.page_count && (
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
              {proposal.page_count}p
            </span>
          )}
          {proposal.file_type && (
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md uppercase">
              {proposal.file_type}
            </span>
          )}
          {proposal.proposal_type && (
            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
              {proposal.proposal_type}
            </span>
          )}
        </div>

        {/* ── Row 3: industry tags ──────────────────────────────────────── */}
        {proposal.client_industry?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {proposal.client_industry.map((ind, i) => (
              <span key={i} className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded-md">
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* ── Row 4: verdict ────────────────────────────────────────────── */}
        {proposal.agent4_output?.verdict && (
          <div className="mb-2.5">
            <VerdictBadge verdict={proposal.agent4_output.verdict} />
          </div>
        )}

        {/* ── Row 5: actions ────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 pt-2.5 border-t border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <Link
            to={`/results/${proposal.id}`}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            View Details <ChevronRight size={12} />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {hasReport && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-white transition-colors disabled:opacity-40"
              >
                {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                {downloading ? 'Loading…' : 'Report'}
              </button>
            )}

            {/* Delete (single) */}
            <button
              onClick={() => onDelete(proposal.id)}
              title="Delete this proposal"
              className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
