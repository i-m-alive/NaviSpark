import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Zap } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 7) return '#34d399'
  if (score >= 5) return '#fbbf24'
  return '#f87171'
}

function verdictStyle(verdict) {
  if (verdict === 'READY TO SEND')       return { bg: 'bg-green-900/40',  border: 'border-green-700', text: 'text-green-300', glow: '0 0 40px rgba(52,211,153,0.25)' }
  if (verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND')         return { bg: 'bg-red-900/40',    border: 'border-red-700',   text: 'text-red-300',   glow: '0 0 40px rgba(248,113,113,0.25)' }
  return                                        { bg: 'bg-yellow-900/30', border: 'border-yellow-700', text: 'text-yellow-300', glow: '0 0 40px rgba(251,191,36,0.2)' }
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, label }) {
  const r    = size * 0.4
  const circ = 2 * Math.PI * r
  const pct  = Math.min(100, Math.max(0, (score / 10) * 100))
  const cx   = size / 2
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={size * 0.09} />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.09}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-white" style={{ fontSize: size * 0.22 }}>{score?.toFixed(1)}</span>
          <span className="text-white/40" style={{ fontSize: size * 0.12 }}>/10</span>
        </div>
      </div>
      {label && <span className="text-white/50 text-[11px] text-center">{label}</span>}
    </div>
  )
}

// ── Build slide data from output ──────────────────────────────────────────────

function buildSlides(output, session) {
  const mustFix   = output.priority_actions?.must_fix   || []
  const shouldFix = output.priority_actions?.should_fix || []
  const strengths = output.top_3_strengths || []
  const verdict   = output.verdict || ''
  const dblFlagged = output.double_flagged_issues || []

  const slides = []

  // 1 — Cover
  slides.push({
    id: 'cover',
    type: 'cover',
    title: session?.original_filename || 'Proposal Review',
    proposalType: session?.proposal_type,
    industries: session?.client_industry?.join(', '),
    date: session?.created_at
      ? new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    label: 'Cover',
  })

  // 2 — Score overview
  slides.push({
    id: 'scores',
    type: 'scores',
    overall: output.overall_score,
    verdict,
    a1: output.agent1_score,
    a2: output.agent2_score,
    a3: output.agent3_score,
    label: 'Scores',
  })

  // 3 — Verdict
  slides.push({
    id: 'verdict',
    type: 'verdict',
    verdict,
    overall: output.overall_score,
    summary: output.plain_english_summary || '',
    label: 'Verdict',
  })

  // 4 — Strengths (if any)
  if (strengths.length > 0) {
    slides.push({
      id: 'strengths',
      type: 'strengths',
      strengths,
      label: 'Strengths',
    })
  }

  // 5 — Critical issues (if any)
  if (mustFix.length > 0) {
    slides.push({
      id: 'issues',
      type: 'issues',
      items: mustFix.slice(0, 4),
      count: mustFix.length,
      label: 'Critical Issues',
    })
  }

  // 6 — Priority actions (if any)
  if (shouldFix.length > 0) {
    slides.push({
      id: 'actions',
      type: 'actions',
      items: shouldFix.slice(0, 4),
      label: 'Priority Actions',
    })
  }

  // 7 — Score breakdown
  slides.push({
    id: 'breakdown',
    type: 'breakdown',
    overall: output.overall_score,
    a1: output.agent1_score,
    a2: output.agent2_score,
    a3: output.agent3_score,
    weightAdjusted: output.weight_adjusted,
    weightLabel: output.weight_label,
    label: 'Score Breakdown',
  })

  // 8 — Recommendation
  slides.push({
    id: 'recommendation',
    type: 'recommendation',
    verdict,
    overall: output.overall_score,
    mustFix: mustFix.slice(0, 3),
    dblFlagged: dblFlagged.slice(0, 2),
    label: 'Recommendation',
  })

  return slides
}

// ── Slide renderers ────────────────────────────────────────────────────────────

function SlideCover({ slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-6">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-800/50 flex items-center justify-center">
          <Zap size={14} className="text-blue-400" />
        </div>
        <div className="text-left">
          <p className="text-[13px] font-bold text-white tracking-tight">NAVISPARK</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">Proposal Intelligence</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-3">Proposal Review</p>
        <h1 className="text-3xl font-bold text-white leading-tight max-w-2xl">{slide.title}</h1>
      </div>

      {(slide.proposalType || slide.industries) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {slide.proposalType && (
            <span className="text-sm text-indigo-300 bg-indigo-950/60 border border-indigo-800 px-3 py-1 rounded-full">
              {slide.proposalType}
            </span>
          )}
          {slide.industries && (
            <span className="text-sm text-teal-300 bg-teal-950/60 border border-teal-800 px-3 py-1 rounded-full">
              {slide.industries}
            </span>
          )}
        </div>
      )}

      {slide.date && (
        <p className="text-sm text-gray-500">{slide.date}</p>
      )}

      {/* Decorative rule */}
      <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mt-2" />
      <p className="text-xs text-gray-600">AI-Powered Proposal Analysis · Confidential</p>
    </div>
  )
}

function SlideScores({ slide }) {
  const vs = verdictStyle(slide.verdict)
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-12 space-y-8">
      <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Score Overview</p>

      {/* Overall ring + verdict */}
      <div className="flex flex-col items-center gap-4">
        <ScoreRing score={slide.overall} size={120} />
        <span className={clsx('text-sm font-bold px-4 py-2 rounded-full border', vs.bg, vs.border, vs.text)}>
          {slide.verdict}
        </span>
      </div>

      {/* Three agent rings */}
      <div className="flex items-end gap-6 sm:gap-12 justify-center flex-wrap">
        <ScoreRing score={slide.a1} size={72} label="Completeness" />
        <ScoreRing score={slide.a2} size={72} label="Commercial" />
        <ScoreRing score={slide.a3} size={72} label="Competitive" />
      </div>
    </div>
  )
}

function SlideVerdict({ slide }) {
  const vs      = verdictStyle(slide.verdict)
  const isReady = slide.verdict === 'READY TO SEND'
  const isFail  = slide.verdict === 'NEEDS MAJOR REVISION' || slide.verdict === 'DO NOT SEND'
  const humanText = isReady
    ? 'This proposal is strong and ready to submit.'
    : isFail
    ? 'This proposal requires significant rework before submission.'
    : 'This proposal needs revisions before it can be submitted.'

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-6">
      <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Verdict</p>

      <div
        className={clsx('px-8 py-4 rounded-2xl border', vs.bg, vs.border)}
        style={{ boxShadow: vs.glow }}
      >
        <p className={clsx('text-5xl font-black tracking-tight', vs.text)}>{slide.verdict}</p>
      </div>

      <div>
        <p className="text-2xl font-semibold text-white leading-snug">{humanText}</p>
        {slide.summary && (
          <p className="text-base text-gray-400 mt-4 leading-relaxed max-w-2xl mx-auto">{slide.summary}</p>
        )}
      </div>

      {/* Score pill */}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-full px-4 py-2">
        <span className="text-lg font-bold" style={{ color: scoreColor(slide.overall) }}>
          {slide.overall?.toFixed(1)}
        </span>
        <span className="text-gray-500 text-sm">/10 overall</span>
      </div>
    </div>
  )
}

function SlideStrengths({ slide }) {
  const icons  = ['✦', '✧', '◈']
  const colors = ['text-green-400', 'text-teal-400', 'text-emerald-400']
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-8">
      <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">What's Working</p>
      <h2 className="text-3xl font-bold text-white">Top Strengths</h2>
      <div className="space-y-5 w-full max-w-2xl text-left">
        {slide.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-4 bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <span className={clsx('text-2xl flex-shrink-0 mt-0.5', colors[i % 3])}>{icons[i % 3]}</span>
            <p className="text-base text-gray-200 leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideIssues({ slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-8">
      <div>
        <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-2">What Needs Fixing</p>
        <h2 className="text-3xl font-bold text-white">
          Critical Issues
          {slide.count > 4 && <span className="text-xl text-gray-500 ml-2">({slide.count} total, top 4 shown)</span>}
        </h2>
      </div>
      <div className="space-y-3 w-full max-w-2xl text-left">
        {slide.items.map((item, i) => (
          <div key={i} className="flex items-start gap-4 bg-red-950/25 border border-red-900/50 rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-red-900 border border-red-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-red-300">{i + 1}</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideActions({ slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-8">
      <div>
        <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mb-2">If Time Allows</p>
        <h2 className="text-3xl font-bold text-white">Priority Actions</h2>
      </div>
      <div className="space-y-3 w-full max-w-2xl text-left">
        {slide.items.map((item, i) => (
          <div key={i} className="flex items-start gap-4 bg-yellow-950/20 border border-yellow-900/40 rounded-xl p-4">
            <div className="w-7 h-7 rounded-full bg-yellow-900/60 border border-yellow-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-yellow-300">{i + 1}</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideBreakdown({ slide }) {
  const bars = [
    { label: 'Completeness & Clarity',   score: slide.a1, color: '#818cf8' },
    { label: 'Estimation & Commercial',  score: slide.a2, color: '#a78bfa' },
    { label: 'Competitive Strength',     score: slide.a3, color: '#34d399' },
    { label: 'Overall Score',            score: slide.overall, color: scoreColor(slide.overall), bold: true },
  ]
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-8">
      <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Score Breakdown</p>
      <h2 className="text-3xl font-bold text-white">How the Score was Calculated</h2>
      <div className="space-y-4 w-full max-w-xl text-left">
        {bars.map((bar, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={clsx('text-sm', bar.bold ? 'font-bold text-white' : 'text-gray-300')}>{bar.label}</span>
              <span className="text-base font-bold font-mono" style={{ color: bar.color }}>{bar.score?.toFixed(1)}</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(bar.score / 10) * 100}%`, backgroundColor: bar.color, boxShadow: `0 0 8px ${bar.color}66` }}
              />
            </div>
          </div>
        ))}
      </div>
      {slide.weightAdjusted && (
        <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg px-4 py-2">
          ⚡ {slide.weightLabel} weighting applied to this proposal type
        </p>
      )}
    </div>
  )
}

function SlideRecommendation({ slide }) {
  const vs      = verdictStyle(slide.verdict)
  const isReady = slide.verdict === 'READY TO SEND'
  const isFail  = slide.verdict === 'NEEDS MAJOR REVISION' || slide.verdict === 'DO NOT SEND'
  const callToAction = isReady
    ? 'Submit this proposal with confidence. Minor polish recommended but not required.'
    : isFail
    ? 'Do not submit in the current state. A thorough revision is required.'
    : `Address the ${slide.mustFix.length} critical issue${slide.mustFix.length > 1 ? 's' : ''} before submission.`

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-16 space-y-6">
      <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Our Recommendation</p>

      <div
        className={clsx('px-6 py-3 rounded-xl border inline-flex items-center gap-2', vs.bg, vs.border)}
        style={{ boxShadow: vs.glow }}
      >
        <span className={clsx('text-xl font-black', vs.text)}>{slide.verdict}</span>
      </div>

      <p className="text-2xl font-semibold text-white max-w-xl leading-snug">{callToAction}</p>

      {!isReady && slide.mustFix.length > 0 && (
        <div className="text-left w-full max-w-lg space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 text-center">Minimum Viable Fixes</p>
          {slide.mustFix.map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className={clsx('font-bold flex-shrink-0', vs.text)}>{i + 1}.</span>
              <span className="leading-snug">{item.action}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-800 w-full max-w-lg flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-blue-500" />
          <span>NaviSpark Proposal Intelligence</span>
        </div>
        <span>Confidential · AI-Generated</span>
      </div>
    </div>
  )
}

function SlideContent({ slide }) {
  switch (slide.type) {
    case 'cover':          return <SlideCover          slide={slide} />
    case 'scores':         return <SlideScores         slide={slide} />
    case 'verdict':        return <SlideVerdict        slide={slide} />
    case 'strengths':      return <SlideStrengths      slide={slide} />
    case 'issues':         return <SlideIssues         slide={slide} />
    case 'actions':        return <SlideActions        slide={slide} />
    case 'breakdown':      return <SlideBreakdown      slide={slide} />
    case 'recommendation': return <SlideRecommendation slide={slide} />
    default:               return null
  }
}

// ── Navigation controls ────────────────────────────────────────────────────────

function NavControls({ current, total, onPrev, onNext, isFullscreen, onToggleFullscreen }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-950/80 border-t border-gray-800 backdrop-blur-sm">
      <button
        onClick={onPrev}
        disabled={current === 0}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={18} /> Prev
      </button>

      {/* Slide dots */}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (i < current) { for (let j = 0; j < current - i; j++) onPrev() }
              else             { for (let j = 0; j < i - current; j++) onNext() }
            }}
            className={clsx(
              'rounded-full transition-all duration-200',
              i === current
                ? 'w-5 h-2 bg-blue-500'
                : 'w-2 h-2 bg-gray-700 hover:bg-gray-500',
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-mono">{current + 1} / {total}</span>
        <button
          onClick={onToggleFullscreen}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <button
          onClick={onNext}
          disabled={current === total - 1}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ── Slide thumbnail strip ──────────────────────────────────────────────────────

function ThumbnailStrip({ slides, current, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1">
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          onClick={() => onSelect(i)}
          className={clsx(
            'flex-shrink-0 flex flex-col items-center gap-1 group transition-all duration-150',
          )}
        >
          <div className={clsx(
            'w-20 h-12 rounded-lg border text-center flex items-center justify-center transition-all duration-150',
            i === current
              ? 'border-blue-500 bg-blue-950/30 scale-105'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:scale-105',
          )}>
            <span className="text-[9px] text-gray-400 px-1 leading-tight">{slide.label}</span>
          </div>
          <span className={clsx('text-[9px] font-mono', i === current ? 'text-blue-400' : 'text-gray-600')}>
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function PresentationView({ output, session }) {
  const [current,     setCurrent]     = useState(0)
  const [isFullscreen, setFullscreen] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [dir, setDir] = useState(1) // 1 = forward, -1 = backward

  const slides = buildSlides(output, session)
  const total  = slides.length

  const goTo = useCallback((index) => {
    if (index < 0 || index >= total || transitioning) return
    setDir(index > current ? 1 : -1)
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(index)
      setTransitioning(false)
    }, 220)
  }, [current, total, transitioning])

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])
  const goNext = useCallback(() => goTo(current + 1), [current, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    goPrev()
      if (e.key === 'Escape' && isFullscreen) setFullscreen(false)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [goNext, goPrev, isFullscreen])

  // Lock body scroll in fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isFullscreen])

  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const slide = slides[current]

  // ── Shared slide area ───────────────────────────────────────────────────────

  const SlideArea = ({ height = '480px' }) => (
    <div
      className="relative bg-gray-950 overflow-hidden flex flex-col"
      style={{ height }}
    >
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Ambient glow in corners */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-purple-600/5 blur-3xl pointer-events-none" />

      {/* Slide content */}
      <div
        className="flex-1 relative z-10"
        style={{
          opacity:    transitioning ? 0 : 1,
          transform:  transitioning ? `translateX(${dir * 24}px)` : 'translateX(0)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        <SlideContent slide={slide} />
      </div>

      {/* Slide label top-left */}
      <div className="absolute top-4 left-5 z-20">
        <span className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">{slide.label}</span>
      </div>

      {/* Slide number top-right */}
      <div className="absolute top-4 right-5 z-20">
        <span className="text-[10px] font-mono text-gray-700">{current + 1}/{total}</span>
      </div>
    </div>
  )

  // ── Embedded view (always rendered) ──────────────────────────────────────

  return (
    <>
    {/* Fullscreen overlay — rendered via portal directly on document.body so it
        breaks out of every parent stacking context (sticky sidebar, overflow-hidden,
        etc.) that would otherwise clip a position:fixed element. */}
    {isFullscreen && createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col"
        style={{ animation: 'fade-in 0.2s ease both' }}
      >
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setFullscreen(false)}
            className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <SlideArea height="100%" />
        <NavControls current={current} total={total} onPrev={goPrev} onNext={goNext}
          isFullscreen onToggleFullscreen={() => setFullscreen(false)} />
      </div>,
      document.body
    )}

    {/* ── Embedded view ─────────────────────────────────────────────── */}
    <div className="max-w-4xl mx-auto pb-8 space-y-4">

      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div>
          <h2 className="text-lg font-bold text-white">Presentation Mode</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Navigate with ← → arrow keys · Click{' '}
            <Maximize2 size={10} className="inline text-gray-400" /> to go full-screen
          </p>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-2 text-sm text-gray-300 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Maximize2 size={14} /> Start Presentation
        </button>
      </div>

      {/* Main slide area (embedded) */}
      <div
        className="rounded-2xl overflow-hidden border border-gray-800"
        style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both' }}
      >
        <SlideArea height="min(480px, 70vw)" />
        <NavControls
          current={current}
          total={total}
          onPrev={goPrev}
          onNext={goNext}
          isFullscreen={false}
          onToggleFullscreen={() => setFullscreen(true)}
        />
      </div>

      {/* Thumbnail strip */}
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
        style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both' }}
      >
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">All Slides</p>
        <ThumbnailStrip slides={slides} current={current} onSelect={goTo} />
      </div>

      {/* Keyboard hint */}
      <div className="text-center">
        <p className="text-[11px] text-gray-600">
          Keyboard: <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400 text-[10px] font-mono">←</kbd>{' '}
          <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400 text-[10px] font-mono">→</kbd>{' '}
          to navigate &nbsp;·&nbsp;{' '}
          <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400 text-[10px] font-mono">Esc</kbd>{' '}
          to exit fullscreen
        </p>
      </div>
    </div>
    </>
  )
}
