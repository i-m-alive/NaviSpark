import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, BookOpen, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

function chapterStatus(score) {
  if (!score && score !== 0) return 'neutral'
  if (score >= 7) return 'strong'
  if (score >= 5) return 'mixed'
  return 'weak'
}

const CHAPTER_STYLE = {
  strong:  { border: 'border-l-green-500',  headBg: 'bg-green-950/25',  icon: CheckCircle2, iconCls: 'text-green-400',  badge: 'bg-green-900/70 text-green-300 border-green-700',  label: 'Strong'   },
  mixed:   { border: 'border-l-yellow-500', headBg: 'bg-yellow-950/15', icon: AlertTriangle, iconCls: 'text-yellow-400', badge: 'bg-yellow-900/70 text-yellow-300 border-yellow-700', label: 'Needs Work' },
  weak:    { border: 'border-l-red-500',    headBg: 'bg-red-950/15',    icon: XCircle,      iconCls: 'text-red-400',    badge: 'bg-red-900/70 text-red-300 border-red-700',           label: 'Weak'     },
  neutral: { border: 'border-l-gray-600',   headBg: '',                 icon: BookOpen,     iconCls: 'text-gray-400',   badge: 'bg-gray-800 text-gray-300 border-gray-700',           label: '—'        },
}

// ── Narrative generators (plain English from raw data) ─────────────────────────

function narrativeClarity(a1out, score) {
  if (!a1out) {
    const q = score >= 7 ? 'strong' : score >= 5 ? 'moderate' : 'needs significant work'
    return `Agent 1 reviewed the proposal for completeness and clarity, rating it ${score?.toFixed(1)}/10 — ${q}. The agent examined how well the document is written, whether all required sections are covered, and whether the scope is communicated without ambiguity.`
  }
  const writing   = a1out.writing_issues || []
  const scope     = a1out.scope_clarity_issues || []
  const jargon    = a1out.jargon_flags || []
  const audit     = a1out.section_audit || []
  const covered   = audit.filter(i => i.status === 'COVERED').length
  const partial   = audit.filter(i => i.status === 'PARTIAL').length
  const missing   = audit.filter(i => i.status === 'MISSING').length
  const assumptions = a1out.high_risk_assumptions || []

  const opener = score >= 7
    ? 'The proposal is well-structured and covers most of what is expected.'
    : score >= 5
    ? 'The proposal covers the basics but has areas that need tightening up.'
    : 'The proposal has meaningful gaps in both writing quality and section coverage.'

  const auditSent = audit.length > 0
    ? ` Of ${audit.length} required checklist sections, ${covered} are fully covered, ${partial} are partial, and ${missing} are missing entirely.`
    : ''

  const writingSent = writing.length > 0
    ? ` ${writing.length} writing issue${writing.length > 1 ? 's were' : ' was'} flagged${writing.filter(i => i.severity === 'CRITICAL').length > 0 ? ` — ${writing.filter(i => i.severity === 'CRITICAL').length} rated critical` : ''}.`
    : ' Writing is clean with no significant issues flagged.'

  const jargonSent = jargon.length > 0
    ? ` ${jargon.length} jargon-heavy passage${jargon.length > 1 ? 's were' : ' was'} identified that may not land well with a non-technical client audience.`
    : ''

  const scopeSent = scope.length > 0
    ? ` ${scope.length} scope clarity gap${scope.length > 1 ? 's need' : ' needs'} addressing — areas where the engagement boundaries remain ambiguous and could lead to disputes later.`
    : ''

  const assumeSent = assumptions.length > 0
    ? ` ${assumptions.length} high-risk assumption${assumptions.length > 1 ? 's are' : ' is'} embedded in the proposal that the client may challenge or reject.`
    : ''

  return opener + auditSent + writingSent + jargonSent + scopeSent + assumeSent
}

function narrativeCommercial(a2out, score) {
  if (!a2out) {
    const q = score >= 7 ? 'sound commercial structure' : score >= 5 ? 'a reasonable but incomplete commercial structure' : 'a weak commercial structure with significant gaps'
    return `Agent 2 examined the commercial and estimation integrity, giving it ${score?.toFixed(1)}/10. The proposal shows ${q}. The agent reviewed pricing completeness, phase coverage, estimation methodology, and arithmetic accuracy across the cost model.`
  }
  const phases   = a2out.missing_phases || []
  const estIssues = a2out.estimation_issues || []
  const priceIssues = a2out.pricing_issues || []
  const arith    = a2out.arithmetic_flags || []
  const cma      = a2out.commercial_model_assessment
  const internal = a2out.internal_flags || []

  const opener = score >= 7
    ? 'The commercial structure of this proposal is solid and well thought out.'
    : score >= 5
    ? 'The commercial model is in place but has gaps that need to be addressed before submission.'
    : 'The commercial structure has significant weaknesses that could cost the deal.'

  const modelSent = cma
    ? ` The proposal uses a ${cma.model_stated || 'stated'} commercial model${cma.appropriate_for_scope ? ', which is appropriate for this scope' : ' — however, the agent flagged concerns about its fit for this engagement'}.`
    : ''

  const phaseSent = phases.length > 0
    ? ` ${phases.length} project phase${phases.length > 1 ? 's are' : ' is'} uncosted or missing from the cost estimate — a gap that could lead to scope creep disputes.`
    : ' All required project phases are accounted for in the cost model.'

  const estSent = estIssues.length > 0
    ? ` ${estIssues.length} estimation issue${estIssues.length > 1 ? 's were' : ' was'} identified including ${estIssues.filter(i => i.severity === 'CRITICAL').length > 0 ? `${estIssues.filter(i => i.severity === 'CRITICAL').length} critical flag${estIssues.filter(i => i.severity === 'CRITICAL').length > 1 ? 's' : ''}` : 'minor concerns'}.`
    : ''

  const arithSent = arith.length > 0
    ? ` ${arith.length} arithmetic discrepanc${arith.length > 1 ? 'ies were' : 'y was'} detected in the pricing calculations — these must be corrected before submission.`
    : ' All arithmetic checks in the pricing model passed without errors.'

  return opener + modelSent + phaseSent + estSent + arithSent
}

function narrativeCompetitive(a3out, score) {
  if (!a3out) {
    const q = score >= 7 ? 'strong competitive positioning' : score >= 5 ? 'adequate but improvable competitive positioning' : 'weak competitive positioning'
    return `Agent 3 evaluated the proposal's competitive strength, scoring it ${score?.toFixed(1)}/10. The proposal shows ${q}. The agent assessed how well the proposal differentiates from generic responses, addresses the client's stated priorities, and builds credibility.`
  }
  const diff     = a3out.differentiation
  const narr     = a3out.narrative_assessment
  const clientFit = a3out.client_fit_issues || []
  const risk     = a3out.risk_transparency_issues || []
  const cred     = a3out.credibility_gaps || []
  const overclaim = a3out.overclaiming_flags || []

  const opener = score >= 7
    ? 'The proposal makes a compelling case for why this team should win the work.'
    : score >= 5
    ? "The proposal has the right instincts but doesn't fully close the competitive gap."
    : "The proposal reads too generically and is unlikely to stand out from competing bids."

  const diffSent = diff
    ? diff.sounds_generic
      ? ` The differentiation analysis flagged that the proposal sounds generic — it does not clearly articulate why this team is the right choice over competitors.`
      : ` The proposal has genuine differentiators: ${(diff.differentiators_found || []).slice(0, 2).join('; ') || 'unique capabilities that were identified'}. `
    : ''

  const narrSent = narr
    ? ` The narrative ${narr.flows_as_story ? 'flows coherently as a story' : 'lacks a clear narrative thread'}${narr.clear_why_us ? ' with a clear "why us" message' : ' and the "why us" message is weak'}.`
    : ''

  const fitSent = clientFit.length > 0
    ? ` ${clientFit.length} client priority gap${clientFit.length > 1 ? 's were' : ' was'} found — areas where the proposal doesn't speak to what the client has stated they care about most.`
    : ' The proposal aligns well with the client\'s stated priorities.'

  const credSent = cred.length > 0
    ? ` ${cred.length} credibility gap${cred.length > 1 ? 's are' : ' is'} present — claims that are not backed by evidence, case studies, or specific proof points.`
    : ''

  const overcSent = overclaim.length > 0
    ? ` ${overclaim.length} overclaiming instance${overclaim.length > 1 ? 's were' : ' was'} flagged — statements that may appear exaggerated or unverifiable to a sceptical client.`
    : ''

  return opener + diffSent + narrSent + fitSent + credSent + overcSent
}

function narrativeVerdict(output) {
  const { verdict, overall_score, plain_english_summary, priority_actions, double_flagged_issues, top_3_strengths } = output
  const mustFix = priority_actions?.must_fix || []
  const dblFlagged = double_flagged_issues || []

  const opener = verdict === 'READY TO SEND'
    ? `After synthesising all three specialist agent reports, Agent 4 concludes that this proposal is ready to submit — scoring ${overall_score?.toFixed(1)}/10 overall.`
    : verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
    ? `After synthesising all three specialist agent reports, Agent 4 concludes that this proposal is not ready for submission — scoring ${overall_score?.toFixed(1)}/10 overall.`
    : `After synthesising all three specialist agent reports, Agent 4 concludes that this proposal needs revisions before submission — scoring ${overall_score?.toFixed(1)}/10 overall.`

  const strengthSent = (top_3_strengths || []).length > 0
    ? ` The proposal's genuine strengths include: ${top_3_strengths.slice(0, 2).join('; ')}.`
    : ''

  const mustFixSent = mustFix.length > 0
    ? ` ${mustFix.length} issue${mustFix.length > 1 ? 's' : ''} must be fixed before this proposal can be submitted.`
    : ' No critical issues were identified that would block submission.'

  const dblSent = dblFlagged.length > 0
    ? ` Notably, ${dblFlagged.length} issue${dblFlagged.length > 1 ? 's were' : ' was'} independently flagged by two or more specialist agents — these are the highest-priority fixes.`
    : ''

  return opener + strengthSent + mustFixSent + dblSent
}

// ── Risk summary at the end ────────────────────────────────────────────────────

function RiskSummary({ output }) {
  const { verdict, overall_score, priority_actions } = output
  const mustFix = priority_actions?.must_fix || []
  const isFail  = verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
  const isReady = verdict === 'READY TO SEND'

  const riskText = isFail
    ? `If submitted in its current state, this proposal carries a high risk of rejection. The client is likely to notice the gaps in commercial structure, clarity, and competitive differentiation. A thorough revision is strongly recommended before any client-facing submission.`
    : isReady
    ? `This proposal is strong enough to submit. Minor polish on the areas flagged above will improve the score further, but should not delay the submission unless time allows.`
    : `If submitted as-is, the ${mustFix.length} unfixed critical issue${mustFix.length > 1 ? 's' : ''} may cost the deal. The client will likely notice gaps in the areas highlighted above. Addressing these before submission is strongly recommended.`

  const borderCls = isFail ? 'border-red-800/60' : isReady ? 'border-green-800/60' : 'border-yellow-800/50'
  const bgCls     = isFail ? 'from-red-950/40'   : isReady ? 'from-green-950/30'   : 'from-yellow-950/25'
  const textCls   = isFail ? 'text-red-300'       : isReady ? 'text-green-300'       : 'text-yellow-300'
  const labelCls  = isFail ? 'text-red-400'       : isReady ? 'text-green-400'       : 'text-yellow-400'

  return (
    <div
      className={clsx('rounded-2xl border bg-gradient-to-b to-gray-900 p-6', borderCls, bgCls)}
      style={{ animation: 'slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) 0.5s both' }}
    >
      <p className={clsx('text-[10px] font-mono uppercase tracking-widest mb-2', labelCls)}>
        What happens if you submit as-is?
      </p>
      <p className={clsx('text-base font-semibold mb-3', textCls)}>
        {isFail ? 'High risk of rejection' : isReady ? 'Ready to submit' : 'Revise before submitting'}
      </p>
      <p className="text-[13px] text-gray-300 leading-relaxed">{riskText}</p>
      {!isReady && mustFix.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Minimum viable fixes</p>
          <ul className="space-y-1.5">
            {mustFix.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <ArrowRight size={12} className={clsx('flex-shrink-0 mt-0.5', labelCls)} />
                {item.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Chapter component ──────────────────────────────────────────────────────────

function Chapter({ number, title, agentTag, score, narrative, keyFinding, mostImportantFix, index }) {
  const [open, setOpen] = useState(true)
  const status = chapterStatus(score)
  const cfg    = CHAPTER_STYLE[status]
  const { icon: Icon } = cfg

  return (
    <div
      className={clsx('border border-gray-800 border-l-[3px] rounded-2xl overflow-hidden', cfg.border)}
      style={{ animation: `slide-up-fade 0.55s cubic-bezier(0.16,1,0.3,1) ${index * 130}ms both` }}
    >
      {/* Header — clickable to collapse */}
      <div
        className={clsx('px-4 sm:px-6 py-4 cursor-pointer select-none flex items-center gap-4', cfg.headBg)}
        onClick={() => setOpen(o => !o)}
      >
        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', cfg.headBg, 'border', cfg.border.replace('border-l-','border-'))}>
          <Icon size={15} className={cfg.iconCls} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Chapter {number}</span>
            <span className="text-[10px] text-gray-600">·</span>
            <span className="text-[10px] font-mono text-gray-600">{agentTag}</span>
          </div>
          <h3 className="text-base font-bold text-white mt-0.5">{title}</h3>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {score != null && (
            <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.badge)}>
              {score.toFixed(1)}/10 · {cfg.label}
            </span>
          )}
          <ChevronDown size={16} className={clsx('text-gray-500 transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-4 space-y-4">

          {/* Narrative paragraph */}
          <p className="text-[14px] text-gray-300 leading-[1.8] font-light">{narrative}</p>

          {/* Key finding pull-quote */}
          {keyFinding && (
            <div className={clsx('pl-5 border-l-[3px] py-1', cfg.border)}>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Key Finding</p>
              <p className="text-sm text-gray-200 leading-relaxed italic">"{keyFinding}"</p>
            </div>
          )}

          {/* Most important fix CTA */}
          {mostImportantFix && (
            <div className="flex items-start gap-3 bg-blue-950/25 border border-blue-900/40 rounded-xl px-4 py-3.5">
              <div className="w-5 h-5 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-400">
                <ArrowRight size={10} />
              </div>
              <div>
                <p className="text-[10px] text-blue-400 font-mono uppercase tracking-widest mb-1">
                  Most Important Fix for this Chapter
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">{mostImportantFix}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Reading progress bar (sticky top inside container) ────────────────────────

function ReadingProgress({ containerRef }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handle = () => {
      const scrollTop    = window.scrollY - (el.offsetTop || 0)
      const totalHeight  = el.scrollHeight - window.innerHeight
      const progress     = totalHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / totalHeight) * 100)) : 0
      setPct(progress)
    }
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  return (
    <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60 px-0 py-2.5 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-5">
      <div className="flex items-center gap-3">
        <BookOpen size={12} className="text-gray-500 flex-shrink-0" />
        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-teal-500 rounded-full transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function StoryboardView({ output, session }) {
  const containerRef = useRef(null)

  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const {
    overall_score, verdict, agent1_score, agent2_score, agent3_score,
    top_3_strengths, priority_actions, double_flagged_issues,
    plain_english_summary,
  } = output

  const a1 = session?.agent1_output
  const a2 = session?.agent2_output
  const a3 = session?.agent3_output

  // Chapter data
  const ch1Narrative = narrativeClarity(a1, agent1_score)
  const ch2Narrative = narrativeCommercial(a2, agent2_score)
  const ch3Narrative = narrativeCompetitive(a3, agent3_score)
  const ch4Narrative = narrativeVerdict(output)

  // Key findings per chapter
  const ch1KeyFinding  = (a1?.writing_issues?.find(i => i.severity === 'CRITICAL') || a1?.writing_issues?.[0])?.why
    || (a1?.scope_clarity_issues?.find(i => i.severity === 'CRITICAL'))?.issue
    || null

  const ch2KeyFinding  = a2?.commercial_model_assessment?.concerns?.[0]
    || (a2?.estimation_issues?.find(i => i.severity === 'CRITICAL'))?.issue
    || (a2?.missing_phases?.[0] ? `Phase missing: ${a2.missing_phases[0].phase}` : null)
    || null

  const ch3KeyFinding  = a3?.differentiation?.sounds_generic
    ? "The proposal reads as a generic template response rather than a tailored, specific answer to this client's brief."
    : (a3?.client_fit_issues?.find(i => i.severity === 'CRITICAL'))?.issue
    || (a3?.credibility_gaps?.[0])?.issue
    || null

  const ch4KeyFinding  = (double_flagged_issues || [])[0]?.issue_summary
    || (top_3_strengths || [])[0]
    || plain_english_summary?.slice(0, 160)
    || null

  // Most important fixes
  const ch1Fix = (a1?.writing_issues?.find(i => i.severity === 'CRITICAL') || a1?.scope_clarity_issues?.find(i => i.severity === 'CRITICAL'))?.recommendation
    || (a1?.scope_clarity_issues?.[0])?.recommendation
    || (a1?.writing_issues?.[0])?.recommendation
    || null

  const ch2Fix = (a2?.estimation_issues?.find(i => i.severity === 'CRITICAL'))?.recommendation
    || (a2?.pricing_issues?.find(i => i.severity === 'CRITICAL'))?.recommendation
    || (a2?.missing_phases?.[0] ? `Add a costed plan for the "${a2.missing_phases[0].phase}" phase.` : null)
    || null

  const ch3Fix = (a3?.client_fit_issues?.find(i => i.severity === 'CRITICAL'))?.recommendation
    || (a3?.credibility_gaps?.find(i => i.severity === 'CRITICAL'))?.issue
    || (a3?.differentiation?.generic_elements?.[0] ? `Replace generic language: "${a3.differentiation.generic_elements[0]}"` : null)
    || null

  const ch4Fix = (priority_actions?.must_fix?.[0])?.action || null

  // Estimated read time (avg 200 wpm)
  const allText = [ch1Narrative, ch2Narrative, ch3Narrative, ch4Narrative].join(' ')
  const wordCount = allText.split(/\s+/).length
  const readMins  = Math.ceil(wordCount / 200)

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto pb-8">

      {/* Progress bar */}
      <ReadingProgress containerRef={containerRef} />

      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5"
        style={{ animation: 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div>
          <h2 className="text-lg font-bold text-white">Analysis Storyboard</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A plain-English narrative of every aspect of this proposal review
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
          <Clock size={11} />
          <span>{readMins} min read</span>
        </div>
      </div>

      {/* Chapters */}
      <div className="space-y-4">
        <Chapter
          number={1}
          title="Clarity & Completeness"
          agentTag="Agent 1 · Specialist Review"
          score={agent1_score}
          narrative={ch1Narrative}
          keyFinding={ch1KeyFinding}
          mostImportantFix={ch1Fix}
          index={0}
        />
        <Chapter
          number={2}
          title="Commercial Integrity"
          agentTag="Agent 2 · Specialist Review"
          score={agent2_score}
          narrative={ch2Narrative}
          keyFinding={ch2KeyFinding}
          mostImportantFix={ch2Fix}
          index={1}
        />
        <Chapter
          number={3}
          title="Competitive Strength"
          agentTag="Agent 3 · Specialist Review"
          score={agent3_score}
          narrative={ch3Narrative}
          keyFinding={ch3KeyFinding}
          mostImportantFix={ch3Fix}
          index={2}
        />
        <Chapter
          number={4}
          title="The Overall Verdict"
          agentTag="Agent 4 · Chief Review Officer"
          score={overall_score}
          narrative={ch4Narrative}
          keyFinding={ch4KeyFinding}
          mostImportantFix={ch4Fix}
          index={3}
        />

        {/* Risk summary */}
        <RiskSummary output={output} />
      </div>
    </div>
  )
}
