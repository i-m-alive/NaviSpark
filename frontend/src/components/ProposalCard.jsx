import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, ChevronRight,
  Trash2, CheckCircle, AlertCircle, Loader2, Wrench,
} from 'lucide-react'
import { useTheme, LIGHT_THEME_IDS } from '../context/ThemeContext'

// ── Relative time ─────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Score helpers ─────────────────────────────────────────────────────────────
const scoreColorDark  = s => s >= 7 ? '#34d399' : s >= 5 ? '#fbbf24' : '#f87171'
const scoreColorLight = s => s >= 7 ? '#15803d' : s >= 5 ? '#a16207' : '#dc2626'
const scoreGlow       = s => s >= 7 ? 'rgba(52,211,153,0.35)' : s >= 5 ? 'rgba(251,191,36,0.35)' : 'rgba(248,113,113,0.35)'

// ── Score ring SVG ────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 52 }) {
  const { theme } = useTheme()
  const isLight = LIGHT_THEME_IDS.has(theme)
  if (score == null) return null
  const r    = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 10)
  const color  = isLight ? scoreColorLight(score) : scoreColorDark(score)
  const glow   = scoreGlow(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--score-track)" strokeWidth="3.5" />
        {/* Fill */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="animate-score-ring"
          style={{ filter: `drop-shadow(0 0 5px ${glow})`, transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Center label */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color, lineHeight: 1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: 7, color: 'var(--score-label)', lineHeight: 1 }}>/10</span>
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_DARK = {
  uploading:        { label: 'Uploading',   bg: 'rgba(113,63,18,0.3)',  border: 'rgba(161,98,7,0.4)',   text: '#fcd34d', pulse: false },
  ready:            { label: 'Ready',       bg: 'rgba(30,58,138,0.3)',  border: 'rgba(37,99,235,0.4)',  text: '#93c5fd', pulse: false },
  agent1_complete:  { label: 'Step 1 done', bg: 'rgba(49,46,129,0.3)',  border: 'rgba(99,102,241,0.4)', text: '#a5b4fc', pulse: false },
  agent2_complete:  { label: 'Step 2 done', bg: 'rgba(59,7,100,0.3)',   border: 'rgba(168,85,247,0.4)', text: '#d8b4fe', pulse: false },
  agent3_complete:  { label: 'Step 3 done', bg: 'rgba(4,47,46,0.3)',    border: 'rgba(13,148,136,0.4)', text: '#5eead4', pulse: false },
  agents_complete:  { label: 'Finalising…', bg: 'rgba(124,45,18,0.3)', border: 'rgba(234,88,12,0.4)',  text: '#fb923c', pulse: true  },
  pipeline_running: { label: 'Analysing…',  bg: 'rgba(124,45,18,0.3)', border: 'rgba(234,88,12,0.4)',  text: '#fb923c', pulse: true  },
  pipeline_failed:  { label: 'Failed',      bg: 'rgba(69,10,10,0.3)',  border: 'rgba(185,28,28,0.4)',  text: '#fca5a5', pulse: false },
  complete:         { label: 'Complete',    bg: 'rgba(6,78,59,0.3)',   border: 'rgba(22,163,74,0.4)',  text: '#86efac', pulse: false },
  error:            { label: 'Error',       bg: 'rgba(69,10,10,0.3)',  border: 'rgba(185,28,28,0.4)',  text: '#fca5a5', pulse: false },
}
const STATUS_LIGHT = {
  uploading:        { label: 'Uploading',   bg: 'rgba(254,243,199,0.9)', border: 'rgba(161,98,7,0.4)',   text: '#92400e', pulse: false },
  ready:            { label: 'Ready',       bg: 'rgba(219,234,254,0.9)', border: 'rgba(37,99,235,0.4)',  text: '#1e40af', pulse: false },
  agent1_complete:  { label: 'Step 1 done', bg: 'rgba(224,231,255,0.9)', border: 'rgba(99,102,241,0.4)', text: '#3730a3', pulse: false },
  agent2_complete:  { label: 'Step 2 done', bg: 'rgba(243,232,255,0.9)', border: 'rgba(168,85,247,0.4)', text: '#6b21a8', pulse: false },
  agent3_complete:  { label: 'Step 3 done', bg: 'rgba(204,251,241,0.9)', border: 'rgba(13,148,136,0.4)', text: '#134e4a', pulse: false },
  agents_complete:  { label: 'Finalising…', bg: 'rgba(255,237,213,0.9)', border: 'rgba(234,88,12,0.4)',  text: '#9a3412', pulse: true  },
  pipeline_running: { label: 'Analysing…',  bg: 'rgba(255,237,213,0.9)', border: 'rgba(234,88,12,0.4)',  text: '#9a3412', pulse: true  },
  pipeline_failed:  { label: 'Failed',      bg: 'rgba(254,226,226,0.9)', border: 'rgba(185,28,28,0.4)',  text: '#7f1d1d', pulse: false },
  complete:         { label: 'Complete',    bg: 'rgba(220,252,231,0.9)', border: 'rgba(22,163,74,0.4)',  text: '#14532d', pulse: false },
  error:            { label: 'Error',       bg: 'rgba(254,226,226,0.9)', border: 'rgba(185,28,28,0.4)',  text: '#7f1d1d', pulse: false },
}

function StatusPill({ status }) {
  const { theme } = useTheme()
  const map = LIGHT_THEME_IDS.has(theme) ? STATUS_LIGHT : STATUS_DARK
  const cfg = map[status] || {
    label: status,
    bg: LIGHT_THEME_IDS.has(theme) ? 'rgba(241,245,249,0.9)' : 'rgba(31,41,55,0.5)',
    border: 'rgba(75,85,99,0.4)',
    text: LIGHT_THEME_IDS.has(theme) ? '#374151' : '#9ca3af',
    pulse: false,
  }
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide">
      {cfg.pulse && <Loader2 size={8} className="animate-spin" />}
      {cfg.label}
    </span>
  )
}

// ── Verdict badge with glow ───────────────────────────────────────────────────
const VERDICT_DARK = {
  'READY TO SEND':         { bg: 'rgba(6,78,59,0.4)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80', icon: <CheckCircle size={10} />, glowClass: 'glow-green'  },
  'REVISE BEFORE SENDING': { bg: 'rgba(78,60,6,0.4)',  border: 'rgba(234,179,8,0.3)',  text: '#fbbf24', icon: <AlertCircle size={10} />, glowClass: 'glow-yellow' },
  'NEEDS MAJOR REVISION':  { bg: 'rgba(69,10,10,0.4)', border: 'rgba(239,68,68,0.3)',  text: '#f87171', icon: <AlertCircle size={10} />, glowClass: 'glow-red'    },
  'DO NOT SEND':           { bg: 'rgba(69,10,10,0.4)', border: 'rgba(239,68,68,0.3)',  text: '#f87171', icon: <AlertCircle size={10} />, glowClass: 'glow-red'    },
}
const VERDICT_LIGHT = {
  'READY TO SEND':         { bg: 'rgba(220,252,231,0.95)', border: 'rgba(22,163,74,0.5)',  text: '#14532d', icon: <CheckCircle size={10} />, glowClass: '' },
  'REVISE BEFORE SENDING': { bg: 'rgba(254,249,195,0.95)', border: 'rgba(161,98,7,0.5)',   text: '#713f12', icon: <AlertCircle size={10} />, glowClass: '' },
  'NEEDS MAJOR REVISION':  { bg: 'rgba(254,226,226,0.95)', border: 'rgba(185,28,28,0.5)',  text: '#7f1d1d', icon: <AlertCircle size={10} />, glowClass: '' },
  'DO NOT SEND':           { bg: 'rgba(254,226,226,0.95)', border: 'rgba(185,28,28,0.5)',  text: '#7f1d1d', icon: <AlertCircle size={10} />, glowClass: '' },
}

function VerdictBadge({ verdict }) {
  const { theme } = useTheme()
  const isLight = LIGHT_THEME_IDS.has(theme)
  if (!verdict) return null
  const map = isLight ? VERDICT_LIGHT : VERDICT_DARK
  const cfg = map[verdict]
  if (!cfg) return null
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.glowClass}`}>
      {cfg.icon} {verdict}
    </span>
  )
}

// ── Top must-fix ──────────────────────────────────────────────────────────────
function TopMustFix({ agent4Output }) {
  const first = agent4Output?.priority_actions?.must_fix?.[0]?.action
  if (!first) return null
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg mb-2.5"
      style={{ background: 'var(--mustfix-bg)', border: '1px solid var(--mustfix-border)' }}>
      <Wrench size={10} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-[10px] text-red-300 leading-relaxed line-clamp-2">
        <span className="font-semibold">Fix: </span>{first}
      </p>
    </div>
  )
}

// ── Pipeline progress bars ────────────────────────────────────────────────────
function PipelineProgressRow({ status }) {
  const isRunning  = status === 'pipeline_running'
  const isFinalise = status === 'agents_complete'
  if (!isRunning && !isFinalise) return null
  const bars = [
    { label: 'Agent 1', color: '#818cf8' },
    { label: 'Agent 2', color: '#c084fc' },
    { label: 'Agent 3', color: '#2dd4bf' },
  ]
  return (
    <div className="mb-2.5">
      <p className="text-[10px] font-medium mb-1.5"
        style={{ color: '#fb923c' }}>
        {isFinalise ? 'Specialists done · Chief Officer running…' : 'Running 3 agents in parallel…'}
      </p>
      <div className="flex gap-1.5">
        {bars.map(({ label, color }) => (
          <div key={label} className="flex-1">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--pipe-track)' }}>
              <div className="h-full rounded-full animate-pipeline-wave" style={{
                width: isFinalise ? '100%' : '60%',
                background: color,
                opacity: isFinalise ? 1 : 0.7,
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ fontSize: 8, color: 'var(--pipe-label)', marginTop: 2, textAlign: 'center' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Top accent bar ────────────────────────────────────────────────────────────
function accentGradient(status, score) {
  if (status === 'pipeline_running' || status === 'agents_complete')
    return 'linear-gradient(90deg, #ea580c, #f97316, #ea580c)'
  if (status === 'pipeline_failed')
    return 'linear-gradient(90deg, #991b1b, #dc2626)'
  if (status === 'complete') {
    if (score >= 7) return 'linear-gradient(90deg, #059669, #10b981, #0d9488)'
    if (score >= 5) return 'linear-gradient(90deg, #d97706, #fbbf24, #b45309)'
    return 'linear-gradient(90deg, #dc2626, #ef4444, #b91c1c)'
  }
  if (status === 'ready') return 'linear-gradient(90deg, #1d4ed8, #3b82f6)'
  return 'linear-gradient(90deg, #374151, #4b5563)'
}

// ── Card border/glow by status ────────────────────────────────────────────────
function cardGlowColor(status, score) {
  if (status === 'pipeline_running' || status === 'agents_complete') return 'rgba(234,88,12,0.25)'
  if (status === 'pipeline_failed') return 'rgba(239,68,68,0.2)'
  if (status === 'complete') {
    if (score >= 7) return 'rgba(52,211,153,0.15)'
    if (score >= 5) return 'rgba(251,191,36,0.12)'
    return 'rgba(248,113,113,0.12)'
  }
  return null
}

// ── Main card ─────────────────────────────────────────────────────────────────
export default function ProposalCard({ proposal, selected, onToggleSelect, onDelete, selectionMode }) {
  const score     = proposal.agent4_output?.overall_score
  const glowColor = cardGlowColor(proposal.status, score)

  return (
    <div
      className="card-hover-glow relative group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        border: `1px solid ${selected ? 'var(--card-border-selected)' : 'var(--card-border)'}`,
        background: selected ? 'var(--card-bg-selected)' : 'var(--card-bg)',
        boxShadow: `var(--card-shadow)${glowColor ? `, 0 0 24px ${glowColor}` : ''}`,
      }}
      onClick={() => selectionMode && onToggleSelect()}
    >
      {/* Top accent bar */}
      <div style={{
        height: 2, width: '100%',
        background: accentGradient(proposal.status, score),
        ...(proposal.status === 'pipeline_running' || proposal.status === 'agents_complete'
          ? { animation: 'pipeline-wave 2s ease-in-out infinite' } : {}),
      }} />

      <div className="p-4">
        {/* ── Row 1: checkbox + icon + title + score ring ──────────────── */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Checkbox */}
          <div className={`flex-shrink-0 mt-1 transition-all duration-150 ${selectionMode || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={e => { e.stopPropagation(); onToggleSelect() }}>
            <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${selected ? 'bg-blue-600 border-blue-500' : 'border-gray-600 hover:border-blue-500'}`}>
              {selected && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>

          {/* File icon */}
          <div className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--card-icon-bg)', border: '1px solid var(--card-icon-border)' }}>
            <FileText size={16} className="text-blue-400" />
          </div>

          {/* Title + time */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-snug">
              {proposal.original_filename || 'Untitled Proposal'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusPill status={proposal.status} />
              <span className="text-[10px] text-gray-600">{timeAgo(proposal.created_at)}</span>
            </div>
          </div>

          {/* Score ring */}
          <ScoreRing score={score} size={48} />
        </div>

        {/* ── Pipeline progress (in-progress only) ──────────────────────── */}
        <PipelineProgressRow status={proposal.status} />

        {/* ── Top must-fix (complete only) ───────────────────────────────── */}
        {proposal.status === 'complete' && <TopMustFix agent4Output={proposal.agent4_output} />}

        {/* ── Meta tags ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            proposal.page_count && `${proposal.page_count}p`,
            proposal.file_type && proposal.file_type.toUpperCase(),
            proposal.proposal_type,
          ].filter(Boolean).map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', color: 'var(--tag-color)' }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ── Industry tags ──────────────────────────────────────────────── */}
        {proposal.client_industry?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {proposal.client_industry.map((ind, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{ background: 'var(--ind-tag-bg)', border: '1px solid var(--ind-tag-border)', color: 'var(--ind-tag-color)' }}>
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* ── Verdict ────────────────────────────────────────────────────── */}
        {proposal.agent4_output?.verdict && (
          <div className="mb-3">
            <VerdictBadge verdict={proposal.agent4_output.verdict} />
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2.5 border-t" style={{ borderColor: 'var(--card-divider)' }}
          onClick={e => e.stopPropagation()}>

          {/* View Details — highlighted pill button */}
          <Link
            to={`/results/${proposal.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200
              text-blue-400 bg-blue-950/0 border border-transparent
              group-hover:bg-blue-950/60 group-hover:border-blue-700/60 group-hover:text-blue-300
              hover:!bg-blue-900/70 hover:!border-blue-600 hover:!text-white hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]
              active:scale-95"
          >
            View Details
            <ChevronRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => onDelete(proposal.id)} title="Delete"
              className="text-[11px] text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
