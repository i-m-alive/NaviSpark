import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listSessions, deleteSession, deleteSessions } from '../api/client'
import Navbar from '../components/Navbar'
import ProposalCard from '../components/ProposalCard'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Plus, Search, SlidersHorizontal, Trash2, FileSearch,
  X, CheckSquare, ChevronDown, AlertTriangle, TrendingUp,
  Upload, Cpu, Award, Activity, FileDown, Loader2, Zap,
  AlertCircle, BarChart3, Sparkles,
} from 'lucide-react'

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Working late'
}
function firstName(user) {
  if (user?.name) return user.name.trim().split(' ')[0]
  const email = user?.email || ''
  if (!email) return 'there'
  const raw = email.split('@')[0].split('.')[0].split('_')[0]
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number') return
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

// ── Filter/sort config ─────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score',  label: 'Highest score' },
  { value: 'name',   label: 'Name A–Z' },
]

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(proposals) {
  const headers = ['Filename','Date','Status','Score','Verdict','Type','Industries','Pages']
  const rows = proposals.map(p => [
    p.original_filename || '', new Date(p.created_at).toLocaleDateString('en-IN'),
    p.status, p.agent4_output?.overall_score?.toFixed(1) || '',
    p.agent4_output?.verdict || '', p.proposal_type || '',
    (p.client_industry || []).join('; '), p.page_count || '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: 'navispark_proposals.csv',
  })
  a.click()
}

// ── Background orbs ───────────────────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="theme-orbs" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Top-left violet orb */}
      <div className="animate-float-orb" style={{
        position: 'absolute', top: '-15%', left: '-8%',
        width: '55%', height: '55%',
        background: 'radial-gradient(circle at 40% 40%, rgba(99,102,241,0.09) 0%, transparent 65%)',
      }} />
      {/* Bottom-right blue orb */}
      <div className="animate-float-orb-r" style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '50%', height: '50%',
        background: 'radial-gradient(circle at 60% 60%, rgba(59,130,246,0.07) 0%, transparent 65%)',
      }} />
      {/* Center-right subtle teal */}
      <div className="animate-float-orb" style={{
        position: 'absolute', top: '40%', right: '15%',
        width: '30%', height: '30%',
        background: 'radial-gradient(circle at 50% 50%, rgba(20,184,166,0.04) 0%, transparent 65%)',
        animationDelay: '-5s',
      }} />
    </div>
  )
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="h-0.5 animate-shimmer" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg animate-shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 rounded animate-shimmer w-3/4" />
            <div className="h-2.5 rounded animate-shimmer w-1/3" />
          </div>
          <div className="w-16 h-5 rounded-full animate-shimmer" />
        </div>
        <div className="flex gap-1.5">
          {[40, 32, 56].map(w => <div key={w} className="h-4 rounded animate-shimmer" style={{ width: w }} />)}
        </div>
        <div className="flex gap-1">
          {[64, 80].map(w => <div key={w} className="h-4 rounded animate-shimmer" style={{ width: w }} />)}
        </div>
        <div className="h-px bg-gray-800 mt-1" />
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded animate-shimmer" />
          <div className="h-3 w-16 rounded animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

const STAT_CONFIGS = [
  {
    key: 'total', label: 'Total Reviews', icon: Activity, colour: 'indigo',
    enterAnim: 'card-enter-left', iconAnim: 'icon-heartbeat',
    particleColor: '#818cf8',
  },
  {
    key: 'avg', label: 'Average Score', icon: BarChart3, colour: 'purple',
    enterAnim: 'card-enter-pop', iconAnim: 'icon-pulse-glow',
    particleColor: '#c084fc',
  },
  {
    key: 'pass', label: 'Pass Rate', icon: Award, colour: 'green',
    enterAnim: 'card-enter-drop', iconAnim: 'icon-wobble',
    particleColor: '#4ade80',
  },
  {
    key: 'pages', label: 'Pages Reviewed', icon: FileSearch, colour: 'teal',
    enterAnim: 'card-enter-right', iconAnim: 'icon-bounce-up',
    particleColor: '#2dd4bf',
  },
]

const STAT_COLOURS = {
  indigo: { border: 'rgba(99,102,241,0.3)',  borderH: 'rgba(99,102,241,0.6)',  glow: 'rgba(99,102,241,0.1)',  glowH: 'rgba(99,102,241,0.22)', icon: '#818cf8', text: '#a5b4fc', shimmer: 'rgba(165,180,252,0.08)' },
  purple: { border: 'rgba(168,85,247,0.3)',  borderH: 'rgba(168,85,247,0.6)',  glow: 'rgba(168,85,247,0.1)',  glowH: 'rgba(168,85,247,0.22)', icon: '#c084fc', text: '#d8b4fe', shimmer: 'rgba(216,180,254,0.08)' },
  green:  { border: 'rgba(34,197,94,0.3)',   borderH: 'rgba(34,197,94,0.6)',   glow: 'rgba(34,197,94,0.1)',   glowH: 'rgba(34,197,94,0.22)',  icon: '#4ade80', text: '#86efac', shimmer: 'rgba(134,239,172,0.08)' },
  teal:   { border: 'rgba(20,184,166,0.3)',  borderH: 'rgba(20,184,166,0.6)',  glow: 'rgba(20,184,166,0.1)',  glowH: 'rgba(20,184,166,0.22)', icon: '#2dd4bf', text: '#5eead4', shimmer: 'rgba(94,234,212,0.08)'  },
}

// Pre-computed particle offsets so there's no Math.random() at render
const PARTICLE_OFFSETS = [
  ['-8px','12px'], ['4px','-6px'], ['-14px','5px'],
  ['10px','8px'],  ['-4px','-12px'], ['16px','-3px'],
]

function StatCard({ label, value, sub, icon: Icon, colour, delay, enterAnim, iconAnim, particleColor }) {
  const c = STAT_COLOURS[colour]
  const cardRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef(null)

  // Count-up
  const numVal  = typeof value === 'number' ? value : null
  const counted = useCountUp(numVal ?? 0)
  const display = numVal !== null ? counted : value

  // 3-D tilt tracking
  const handleMouseMove = useCallback(e => {
    const el  = cardRef.current
    if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const rx = ((e.clientY - top)  / height - 0.5) * -14
    const ry = ((e.clientX - left) / width  - 0.5) *  14
    el.style.transform = `perspective(520px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) scale(1.03)`
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimeout(leaveTimer.current)
    setLeaving(false)
    setHovered(true)
    const el = cardRef.current
    if (!el) return
    el.style.boxShadow = `0 0 0 1px ${c.borderH}, 0 0 40px ${c.glowH}, 0 12px 32px rgba(0,0,0,0.5)`
  }, [c])

  const handleMouseLeave = useCallback(() => {
    setHovered(false)
    setLeaving(true)
    leaveTimer.current = setTimeout(() => setLeaving(false), 500)
    const el = cardRef.current
    if (!el) return
    el.style.transform = 'perspective(520px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)'
    el.style.boxShadow = `0 0 0 1px ${c.border}, 0 4px 20px rgba(0,0,0,0.3)`
  }, [c])

  useEffect(() => () => clearTimeout(leaveTimer.current), [])

  return (
    <div
      ref={cardRef}
      style={{
        animationName: enterAnim,
        animationDuration: '0.75s',
        animationDelay: `${delay}ms`,
        animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        animationFillMode: 'both',
        padding: '1px',
        borderRadius: '18px',
        background: `linear-gradient(135deg, ${c.border}, transparent 60%)`,
        boxShadow: `0 0 0 1px ${c.border}, 0 4px 20px rgba(0,0,0,0.3)`,
        transition: 'box-shadow 0.35s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Inner card ──────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: '17px',
        background: `linear-gradient(135deg, ${c.glow}, var(--t-card-inner, #04060e) 55%)`,
        padding: '16px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 100,
      }}>

        {/* ── Shimmer sweep (triggers on hover) ─────────────────────────── */}
        {hovered && (
          <div key="shimmer" style={{
            position: 'absolute', top: 0, bottom: 0, width: '50%',
            background: `linear-gradient(90deg, transparent, ${c.shimmer}, transparent)`,
            animation: 'shimmer-sweep 0.65s ease-in-out forwards',
            pointerEvents: 'none', zIndex: 8,
          }} />
        )}

        {/* ── Floating particles (trigger on hover) ─────────────────────── */}
        {hovered && PARTICLE_OFFSETS.map(([dx, dx2], i) => (
          <div key={i} style={{
            position: 'absolute',
            bottom: 12 + (i % 3) * 8,
            left: `${15 + i * 14}%`,
            width: 4 - (i % 2),
            height: 4 - (i % 2),
            borderRadius: '50%',
            background: particleColor,
            opacity: 0.7,
            animation: `${i % 2 === 0 ? 'particle-rise' : 'particle-rise-2'} ${0.9 + i * 0.15}s ease-out ${i * 0.08}s forwards`,
            '--dx': dx, '--dx2': dx2,
            pointerEvents: 'none', zIndex: 7,
          }} />
        ))}

        {/* ── Large background watermark icon ───────────────────────────── */}
        <div style={{
          position: 'absolute', right: -6, top: -6, pointerEvents: 'none',
          opacity: hovered ? 0.12 : 0.055,
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          transform: hovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
          zIndex: 0,
        }}>
          <Icon size={80} color={c.icon} />
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Icon box */}
          <div style={{
            padding: 8, borderRadius: 12, flexShrink: 0,
            background: hovered ? c.glowH : c.glow,
            border: `1px solid ${hovered ? c.borderH : c.border}`,
            transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
            boxShadow: hovered ? `0 0 16px ${c.glowH}` : 'none',
          }}>
            <div style={{
              color: c.icon,
              animation: hovered ? `${iconAnim} 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards` : 'none',
              display: 'flex',
            }}>
              <Icon size={17} />
            </div>
          </div>

          {/* Text */}
          <div>
            <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>
              {label}
            </p>
            <p style={{
              fontSize: 26, fontWeight: 800, lineHeight: 1, color: c.text,
              animation: hovered ? 'number-hover-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
              display: 'block',
            }}>
              {display}
            </p>
            {sub && (
              <p style={{ fontSize: 10, color: '#4b5563', marginTop: 5 }}>{sub}</p>
            )}
          </div>
        </div>

        {/* ── Bottom glow bar (grows on hover) ──────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 1,
          background: `linear-gradient(90deg, transparent, ${c.borderH}, transparent)`,
          opacity: hovered ? 0.8 : 0,
          transition: 'opacity 0.3s ease',
          borderRadius: '50%',
          zIndex: 5,
        }} />
      </div>
    </div>
  )
}

function StatsBar({ proposals }) {
  const completed  = proposals.filter(p => p.status === 'complete' && p.agent4_output)
  const avgScore   = completed.length > 0
    ? completed.reduce((s, p) => s + (p.agent4_output?.overall_score || 0), 0) / completed.length
    : null
  const passCount  = completed.filter(p => p.agent4_output?.verdict === 'READY TO SEND').length
  const passRate   = completed.length > 0 ? Math.round((passCount / completed.length) * 100) : null
  const totalPages = proposals.reduce((s, p) => s + (p.page_count || 0), 0)

  const statsData = {
    total: { value: proposals.length,                               sub: `${completed.length} complete` },
    avg:   { value: avgScore != null ? avgScore.toFixed(1) : '—',  sub: 'out of 10.0' },
    pass:  { value: passRate != null ? `${passRate}%` : '—',       sub: 'ready to send' },
    pages: { value: totalPages || 0,                               sub: 'total pages' },
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
      {STAT_CONFIGS.map(({ key, label, icon, colour, enterAnim, iconAnim, particleColor }, i) => (
        <StatCard
          key={key}
          label={label}
          value={statsData[key].value}
          sub={statsData[key].sub}
          icon={icon}
          colour={colour}
          delay={i * 80}
          enterAnim={enterAnim}
          iconAnim={iconAnim}
          particleColor={particleColor}
        />
      ))}
    </div>
  )
}

// ── Live pipeline banner ──────────────────────────────────────────────────────
const IN_PROGRESS = new Set(['pipeline_running', 'agents_complete'])

function PipelineBanner({ proposals }) {
  const active = proposals.filter(p => IN_PROGRESS.has(p.status))
  if (!active.length) return null
  return (
    <div className="mb-5 space-y-2">
      {active.map(p => (
        <Link key={p.id} to={`/results/${p.id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-800/60 hover:border-orange-700 transition-all duration-200 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.12), rgba(180,83,9,0.06))' }}
        >
          {/* Animated wave background */}
          <div className="absolute inset-0 animate-pipeline-wave pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.04), transparent)' }} />
          <div className="relative flex items-center gap-3 w-full">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(234,88,12,0.2)' }}>
              <Loader2 size={14} className="text-orange-400 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-orange-300 truncate">
                {p.status === 'agents_complete' ? 'Chief Review Officer synthesising final verdict…' : 'Agents 1, 2 & 3 running in parallel…'}
              </p>
              <p className="text-[10px] text-orange-600 truncate mt-0.5">{p.original_filename}</p>
            </div>
            <span className="text-[10px] text-orange-500/80 shrink-0 font-medium">View →</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Needs attention ───────────────────────────────────────────────────────────
function NeedsAttentionSection({ proposals }) {
  const [open, setOpen] = useState(false)
  const items = proposals.filter(p =>
    p.status === 'pipeline_failed' ||
    (p.agent4_output?.overall_score != null && p.agent4_output.overall_score < 5.0) ||
    p.agent4_output?.verdict === 'NEEDS MAJOR REVISION' || p.agent4_output?.verdict === 'DO NOT SEND'
  )
  if (!items.length) return null
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mb-2.5 group cursor-pointer focus:outline-none"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 glow-red shrink-0" />
        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest flex-1 text-left">
          Needs Attention · {items.length}
        </p>
        <ChevronDown
          size={13}
          className={`text-red-400 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      {open && (
        <div className="rounded-xl border border-red-900/40 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.15), rgba(69,10,10,0.08))' }}>
          {items.map((p, i) => {
            const score   = p.agent4_output?.overall_score
            const verdict = p.agent4_output?.verdict
            const reason  = p.status === 'pipeline_failed'
              ? 'Analysis failed — click to retry'
              : verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
              ? `Needs Major Revision · Score ${score?.toFixed(1)}`
              : `Low score: ${score?.toFixed(1)} / 10`
            return (
              <Link key={p.id} to={`/results/${p.id}`}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-red-950/30 transition-colors ${i < items.length - 1 ? 'border-b border-red-900/30' : ''}`}>
                <AlertCircle size={12} className="text-red-400 shrink-0" />
                <p className="text-xs text-gray-300 truncate flex-1">{p.original_filename || 'Untitled'}</p>
                <p className="text-[10px] text-red-400 shrink-0 font-medium">{reason}</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Score trend SVG chart ─────────────────────────────────────────────────────
function ScoreTrendChart({ proposals }) {
  const completed = proposals
    .filter(p => p.status === 'complete' && p.agent4_output?.overall_score != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-8)
  if (completed.length < 3) return null

  const scores = completed.map(p => p.agent4_output.overall_score)
  const latest = scores[scores.length - 1]
  const first  = scores[0]
  const delta  = latest - first

  const W = 320, H = 70, PX = 16, PY = 8
  const pts = scores.map((s, i) => ({
    x: PX + (i / (scores.length - 1)) * (W - PX * 2),
    y: PY + (1 - s / 10) * (H - PY * 2),
  }))

  // Smooth bezier path
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cx1 = prev.x + (p.x - prev.x) * 0.5
    const cx2 = prev.x + (p.x - prev.x) * 0.5
    return `C ${cx1.toFixed(1)} ${prev.y.toFixed(1)}, ${cx2.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join(' ')

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`

  const dotColor = (s) => s >= 7 ? '#34d399' : s >= 5 ? '#fbbf24' : '#f87171'

  return (
    <div className="rounded-2xl border border-gray-800/60 mb-5 overflow-hidden animate-slide-up"
      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.04), var(--t-bg2, #0a0f1a))' }}>
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-900/40">
            <TrendingUp size={13} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-300">Score Trend</p>
            <p className="text-[10px] text-gray-600">Last {completed.length} completed reviews</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {delta > 0 ? `↑ +${delta.toFixed(1)}` : delta < 0 ? `↓ ${delta.toFixed(1)}` : '→ Stable'}
          </p>
          <p className="text-[10px] text-gray-600">first → latest</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#f87171" />
              <stop offset="50%"  stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#60a5fa" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[2.5, 5, 7.5].map(v => {
            const y = PY + (1 - v / 10) * (H - PY * 2)
            return <line key={v} x1={PX} y1={y} x2={W - PX} y2={y} stroke="var(--t-svg-grid, rgba(255,255,255,0.04))" strokeWidth="1" />
          })}
          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="animate-draw-line"
            style={{ strokeDasharray: 800 }} />
          {/* Dots */}
          {pts.map((p, i) => {
            const isLatest = i === pts.length - 1
            return (
              <g key={i}>
                {isLatest && <circle cx={p.x} cy={p.y} r={7} fill={dotColor(scores[i])} opacity="0.15" />}
                <circle cx={p.x} cy={p.y} r={isLatest ? 4 : 3} fill={dotColor(scores[i])}
                  stroke="var(--t-bg1, #0a0f1a)" strokeWidth={isLatest ? 2 : 1.5} />
              </g>
            )
          })}
          {/* Score labels for first and last */}
          <text x={pts[0].x} y={pts[0].y - 8} textAnchor="middle" fontSize="8" fill={dotColor(scores[0])} fontWeight="600">
            {scores[0].toFixed(1)}
          </text>
          <text x={pts[pts.length-1].x} y={pts[pts.length-1].y - 8} textAnchor="middle" fontSize="9" fill={dotColor(latest)} fontWeight="700">
            {latest.toFixed(1)}
          </text>
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-1 -mt-1">
          <p className="text-[9px] text-gray-700">Oldest</p>
          <p className="text-[9px] text-gray-700">Latest</p>
        </div>
      </div>
    </div>
  )
}

// ── Common issues panel ───────────────────────────────────────────────────────
function CommonIssuesPanel({ proposals }) {
  const completed = proposals.filter(p => p.status === 'complete' && p.agent4_output)
  if (completed.length < 2) return null

  const allActions = completed
    .flatMap(p => (p.agent4_output?.priority_actions?.must_fix || []).map(i => i.action || ''))
    .filter(Boolean)
  if (!allActions.length) return null

  const freq = {}
  allActions.forEach(a => {
    const key = a.slice(0, 60).toLowerCase()
    if (!freq[key]) freq[key] = { text: a, count: 0 }
    freq[key].count++
  })
  const top = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 3)
  if (!top.length) return null

  return (
    <div className="rounded-2xl border border-amber-900/30 overflow-hidden mb-5"
      style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.12), rgba(78,38,0,0.06))' }}>
      <div className="px-5 py-3.5 border-b border-amber-900/20 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-900/40">
          <Zap size={13} className="text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-400">Recurring Issues</p>
          <p className="text-[10px] text-gray-600">Patterns across {completed.length} completed reviews</p>
        </div>
      </div>
      <div className="px-5 py-3 space-y-2.5">
        {top.map((issue, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px"
              style={{ background: 'rgba(120,53,15,0.4)', border: '1px solid rgba(180,83,9,0.3)' }}>
              <span className="text-[9px] font-bold text-amber-500">{i + 1}</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed flex-1 line-clamp-2">{issue.text}</p>
            {issue.count > 1 && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(120,53,15,0.4)', color: '#fbbf24', border: '1px solid rgba(180,83,9,0.3)' }}>
                ×{issue.count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 py-2.5 border-t border-amber-900/20">
        <p className="text-[10px] text-gray-600">Fix these patterns in your proposal templates to raise scores consistently.</p>
      </div>
    </div>
  )
}

// ── Delete modal ──────────────────────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
        </div>
        <h3 className="text-base font-semibold text-white text-center mb-1">
          Delete {count} proposal{count !== 1 ? 's' : ''}?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          This cannot be undone. All agent results will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-sm text-white font-medium transition-colors flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.value === value)
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-all duration-150 ${
          value !== options[0]?.value
            ? 'border-blue-700 bg-blue-950 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
            : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-gray-200 hover:border-gray-600'
        }`}>
        {label}: <span className="font-medium">{current?.label}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-20 min-w-[190px] overflow-hidden animate-slide-down"
          style={{ backdropFilter: 'blur(12px)' }}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-800 ${opt.value === value ? 'text-blue-400 bg-gray-800/80' : 'text-gray-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
          <FileSearch size={24} className="text-gray-600" />
        </div>
        <p className="text-gray-300 font-medium mb-1">No proposals match your filters</p>
        <p className="text-gray-600 text-sm">Try adjusting your search or filters.</p>
      </div>
    )
  }
  const steps = [
    { num: '01', icon: Upload, label: 'Upload',       desc: 'Drop your PDF or PPTX proposal' },
    { num: '02', icon: Cpu,    label: 'AI Reviews',   desc: '3 specialist agents run in parallel' },
    { num: '03', icon: Award,  label: 'Get Verdict',  desc: 'Score, priority fixes & final report' },
  ]
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="max-w-md w-full text-center mb-10">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center animate-pulse-glow"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Sparkles size={34} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Analyze your first proposal</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Upload any PDF or PPTX and get a comprehensive AI-powered review in under 2 minutes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-sm w-full mb-8">
        {steps.map(({ num, icon: Icon, label, desc }, i) => (
          <div key={num} className="text-center animate-stat-enter" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-gray-800"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent)' }}>
              <Icon size={20} className="text-gray-500" />
            </div>
            <p className="text-[10px] text-gray-700 font-mono mb-1">{num}</p>
            <p className="text-xs font-semibold text-white mb-0.5">{label}</p>
            <p className="text-[10px] text-gray-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm animate-pulse-glow">
        <Plus size={15} /> Start your first review
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()

  const [proposals, setProposals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [selected, setSelected]   = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [search, setSearch]       = useState('')
  const [typeFilter, setType]     = useState('all')
  const [sortBy, setSort]         = useState('newest')

  useEffect(() => {
    listSessions()
      .then(data => setProposals(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const typeOptions = useMemo(() => {
    const counts = {}
    proposals.forEach(p => { if (p.proposal_type) counts[p.proposal_type] = (counts[p.proposal_type] || 0) + 1 })
    return [
      { value: 'all', label: `All types (${proposals.length})` },
      ...Object.entries(counts).map(([t, n]) => ({ value: t, label: `${t} (${n})` })),
    ]
  }, [proposals])

  const filtered = useMemo(() => {
    let list = [...proposals]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => (p.original_filename || '').toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') list = list.filter(p => p.proposal_type === typeFilter)
    if (sortBy === 'oldest')  list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sortBy === 'score') list.sort((a, b) => (b.agent4_output?.overall_score ?? -1) - (a.agent4_output?.overall_score ?? -1))
    else if (sortBy === 'name')  list.sort((a, b) => (a.original_filename || '').localeCompare(b.original_filename || ''))
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [proposals, search, typeFilter, sortBy])

  const isFiltered = search || typeFilter !== 'all'

  const toggleSelect    = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleSelectAll = () => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(p => p.id)))
  const clearSelection  = () => setSelected(new Set())

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      const ids = [...selected]
      ids.length === 1 ? await deleteSession(ids[0]) : await deleteSessions(ids)
      setProposals(prev => prev.filter(p => !selected.has(p.id)))
      setSelected(new Set()); setShowModal(false)
    } catch (err) { setError(err.message) }
    finally { setDeleting(false) }
  }
  const handleDeleteSingle = id => { setSelected(new Set([id])); setShowModal(true) }

  const greeting          = getGreeting()
  const name              = firstName(user)
  const allVisibleSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected      = selected.size > 0

  return (
    <div className="min-h-screen dash-bg relative">
      <BackgroundOrbs />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />

        {showModal && (
          <DeleteModal count={selected.size} onConfirm={handleDeleteConfirm}
            onCancel={() => { setShowModal(false); clearSelection() }} loading={deleting} />
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-7 animate-slide-up">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {greeting},{' '}
                <span style={{ background: 'linear-gradient(90deg,#818cf8,#60a5fa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', backgroundSize: '200% auto' }}>
                  {name}
                </span>{' '}
                👋
              </h1>
              <p className="text-sm text-gray-500 mt-1 truncate max-w-xs sm:max-w-none">
                {proposals.length === 0
                  ? 'No proposals yet · Upload your first one below'
                  : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''} · ${user?.email}`}
              </p>
            </div>
            <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm animate-pulse-glow flex-shrink-0">
              <Plus size={15} /> New Review
            </Link>
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl mb-5 flex items-center justify-between animate-slide-down">
              {error}
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-300 transition-colors"><X size={14} /></button>
            </div>
          )}

          {/* ── Loading skeleton ───────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="rounded-2xl p-4 h-24 animate-shimmer border border-gray-800" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
              </div>
            </div>

          ) : proposals.length === 0 ? (
            <EmptyState filtered={false} />

          ) : (
            <>
              {/* Stats */}
              <StatsBar proposals={proposals} />

              {/* Pipeline banner */}
              <PipelineBanner proposals={proposals} />

              {/* Needs attention */}
              <NeedsAttentionSection proposals={proposals} />

              {/* Search + filters */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4 animate-slide-up-delay">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="text" placeholder="Search proposals…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-900/80 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-700 transition-all"
                    style={{ backdropFilter: 'blur(8px)' }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={13} className="text-gray-600 flex-shrink-0" />
                  <FilterDropdown label="Type" value={typeFilter} options={typeOptions} onChange={setType} />
                  <FilterDropdown label="Sort" value={sortBy} options={SORT_OPTIONS} onChange={setSort} />
                </div>
              </div>

              {/* Selection toolbar */}
              {someSelected && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-xl mb-4 animate-slide-down border border-blue-800/60"
                  style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.4), rgba(29,78,216,0.2))', backdropFilter: 'blur(8px)' }}>
                  <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-blue-300">
                    <CheckSquare size={14} />
                    {allVisibleSelected ? 'Deselect all' : 'Select all'}
                  </button>
                  <span className="text-xs text-blue-400 font-semibold">{selected.size} selected</span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button onClick={() => exportCSV(filtered.filter(p => selected.has(p.id)))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors">
                      <FileDown size={13} /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">CSV</span>
                    </button>
                    <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={() => setShowModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors">
                      <Trash2 size={13} /> Delete {selected.size}
                    </button>
                  </div>
                </div>
              )}

              {/* Result count */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600">
                  {isFiltered ? `${filtered.length} of ${proposals.length} proposals` : `${proposals.length} proposal${proposals.length !== 1 ? 's' : ''}`}
                </p>
                <div className="flex items-center gap-3">
                  {proposals.length > 1 && (
                    <button onClick={() => exportCSV(proposals)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">
                      <FileDown size={11} /> Export all
                    </button>
                  )}
                  {filtered.length > 1 && (
                    <button onClick={toggleSelectAll} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      <CheckSquare size={12} />
                      {allVisibleSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
              </div>

              {/* Grid */}
              {filtered.length === 0 ? (
                <EmptyState filtered={!!isFiltered} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
                  {filtered.map((proposal, i) => (
                    <div key={proposal.id} className="animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                      <ProposalCard
                        proposal={proposal}
                        selected={selected.has(proposal.id)}
                        onToggleSelect={() => toggleSelect(proposal.id)}
                        onDelete={() => handleDeleteSingle(proposal.id)}
                        selectionMode={someSelected}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Insights section */}
              <ScoreTrendChart proposals={proposals} />
              <CommonIssuesPanel proposals={proposals} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
