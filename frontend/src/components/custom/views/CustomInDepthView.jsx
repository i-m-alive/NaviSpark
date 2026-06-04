/**
 * CustomInDepthView — mirrors InDepthView for the Custom Checklist Pipeline.
 *
 * Structure (identical to standard InDepthView):
 *   1. ScoreTraceability table — always visible at top
 *   2. One card with 4 tabs (same visual style as standard):
 *        NCR1 — Clarity & Completeness   (mirrors Agent 1 panel)
 *        NCR2 — Commercial Strength      (mirrors Agent 2 panel)
 *        NCR3 — Competitive Position     (mirrors Agent 3 panel)
 *        NC4  — Final Verdict Report     (mirrors Agent 4 panel)
 *
 * Tab content maps 1-to-1 with the standard InDepthView panels.
 */

import { useState } from 'react'
import { clsx } from 'clsx'
import VerdictBanner        from '../../agent4/VerdictBanner'
import ScoreRadar           from '../../agent4/ScoreRadar'
import PriorityActionList   from '../../agent4/PriorityActionList'
import CrossConsistencyPanel from '../../agent4/CrossConsistencyPanel'
import DoubleFlaggedIssues  from '../../agent4/DoubleFlaggedIssues'
import TopStrengths         from '../../agent4/TopStrengths'
import CustomChecklistGrid  from '../CustomChecklistGrid'

// ── Shared primitives (identical to InDepthView) ───────────────────────────────

function SevBadge({ severity }) {
  const map = {
    CRITICAL: 'bg-red-900/70 text-red-300 border-red-700',
    MAJOR:    'bg-yellow-900/70 text-yellow-300 border-yellow-700',
    MINOR:    'bg-blue-900/70 text-blue-300 border-blue-700',
  }
  return (
    <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded border', map[severity] || map.MINOR)}>
      {severity || 'MINOR'}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase()
  const map = {
    COVERED: 'bg-green-900/70 text-green-300 border-green-700',
    PRESENT: 'bg-green-900/70 text-green-300 border-green-700',
    PARTIAL: 'bg-yellow-900/70 text-yellow-300 border-yellow-700',
    MISSING: 'bg-red-900/70 text-red-300 border-red-700',
    ABSENT:  'bg-red-900/70 text-red-300 border-red-700',
  }
  const icon = { COVERED: '✓', PRESENT: '✓', PARTIAL: '~', MISSING: '✕', ABSENT: '✕' }
  return (
    <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded border', map[s] || map.MISSING)}>
      {icon[s] || '?'} {s}
    </span>
  )
}

function ScoreTable({ scores, rows }) {
  if (!scores) return null
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-gray-600 font-normal px-4 py-2.5 w-56">Dimension</th>
            <th className="text-right text-gray-600 font-normal px-4 py-2.5 w-16">Score</th>
            <th className="text-left text-gray-600 font-normal px-4 py-2.5">Bar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => {
            const val = scores[key]
            if (val == null) return null
            const color = val >= 7 ? '#34d399' : val >= 5 ? '#fbbf24' : '#f87171'
            return (
              <tr key={key} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-2.5 text-gray-300">{label}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color }}>{val.toFixed(1)}</td>
                <td className="px-4 py-2.5">
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(val / 10) * 100}%`, backgroundColor: color }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SecHead({ title, count, countCls = 'bg-gray-800 text-gray-400 border-gray-700' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
      {count !== undefined && (
        <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded border', countCls)}>{count}</span>
      )}
    </div>
  )
}

function GreenNotice({ msg = 'None found.' }) {
  return (
    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/40 border border-green-900/50 rounded-lg px-3 py-2.5">
      <span>✓</span><span>{msg}</span>
    </div>
  )
}

function IssueCard({ children, severity }) {
  const accent = { CRITICAL: 'border-l-red-600', MAJOR: 'border-l-yellow-500', MINOR: 'border-l-blue-500' }
  return (
    <div className={clsx('bg-gray-950 border border-gray-800 border-l-2 rounded-xl p-4', accent[severity] || 'border-l-gray-700')}>
      {children}
    </div>
  )
}

// ── Score Traceability (top of view, always visible) ──────────────────────────

function ScoreTraceability({ ncr1Result, ncr2Result, ncr3Result, categoryScores, sectionScorecard }) {
  // NCR sub-dimension rows
  const dims = [
    // NCR1 dimensions
    { key: 'section_completeness', label: 'Section Completeness', ncr1k: 'section_completeness' },
    { key: 'writing_quality',      label: 'Writing Quality',      ncr1k: 'writing_quality' },
    { key: 'scope_clarity',        label: 'Scope Clarity',        ncr1k: 'scope_clarity' },
    { key: 'client_coverage',      label: 'Client Coverage',      ncr1k: 'client_coverage' },
    // NCR2 dimensions
    { key: 'estimation_rigour',    label: 'Estimation Rigour',    ncr2k: 'estimation_rigour' },
    { key: 'phase_coverage',       label: 'Phase Coverage',       ncr2k: 'phase_coverage' },
    { key: 'pricing_completeness', label: 'Pricing Completeness', ncr2k: 'pricing_completeness' },
    // NCR3 dimensions
    { key: 'client_fit',           label: 'Client Fit',           ncr3k: 'client_fit' },
    { key: 'differentiation',      label: 'Differentiation',      ncr3k: 'differentiation' },
    { key: 'risk_transparency',    label: 'Risk Transparency',    ncr3k: 'risk_transparency' },
    { key: 'credibility',          label: 'Credibility',          ncr3k: 'credibility' },
    { key: 'narrative',            label: 'Narrative',            ncr3k: 'narrative' },
    { key: 'industry_factors',     label: 'Industry Factors',     ncr3k: 'industry_factors' },
  ]

  const sc = sectionScorecard || categoryScores || {}
  const n1s = ncr1Result?.scores || {}
  const n2s = ncr2Result?.scores || {}
  const n3s = ncr3Result?.scores || {}

  // Only render rows where at least one score exists
  const visibleDims = dims.filter(d => {
    const n1v = d.ncr1k ? n1s[d.ncr1k] : null
    const n2v = d.ncr2k ? n2s[d.ncr2k] : null
    const n3v = d.ncr3k ? n3s[d.ncr3k] : null
    const fv  = sc[d.key]
    return n1v != null || n2v != null || n3v != null || fv != null
  })

  if (visibleDims.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Score Traceability</h3>
        <p className="text-[11px] text-gray-600 mt-0.5">Which specialist reviewer contributed to each dimension score</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-600 font-normal px-4 py-2.5">Dimension</th>
              <th className="text-center text-indigo-500/70 font-mono font-normal px-3 py-2.5 w-16">NCR1</th>
              <th className="text-center text-purple-500/70 font-mono font-normal px-3 py-2.5 w-16">NCR2</th>
              <th className="text-center text-teal-500/70 font-mono font-normal px-3 py-2.5 w-16">NCR3</th>
              <th className="text-center text-orange-500/70 font-mono font-normal px-3 py-2.5 w-20">Score</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2.5 w-36">Bar</th>
            </tr>
          </thead>
          <tbody>
            {visibleDims.map(dim => {
              const n1v   = dim.ncr1k ? n1s[dim.ncr1k] : null
              const n2v   = dim.ncr2k ? n2s[dim.ncr2k] : null
              const n3v   = dim.ncr3k ? n3s[dim.ncr3k] : null
              const final = n1v ?? n2v ?? n3v ?? sc[dim.key]
              if (final == null) return null
              const color = final >= 7 ? '#34d399' : final >= 5 ? '#fbbf24' : '#f87171'
              return (
                <tr key={dim.key} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-gray-300">{dim.label}</td>
                  <td className="px-3 py-2.5 text-center">{n1v != null ? <span className="font-mono text-indigo-400">{n1v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">{n2v != null ? <span className="font-mono text-purple-400">{n2v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">{n3v != null ? <span className="font-mono text-teal-400">{n3v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-bold" style={{ color }}>{final.toFixed(1)}</td>
                  <td className="px-3 py-2.5">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(final / 10) * 100}%`, backgroundColor: color }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── NCR1 Panel (mirrors Agent1Panel) ─────────────────────────────────────────

function NCR1Panel({ result, overallScore }) {
  if (!result) return <p className="text-sm text-gray-500 py-10 text-center">NCR1 (Clarity & Completeness) output not available for this session.</p>

  const sc          = { ...(result.scores || {}), ...(overallScore != null ? { overall: overallScore } : {}) }
  const audit       = result.section_audit || []
  const writing     = result.writing_issues || []
  const scope       = result.scope_clarity_issues || []
  const assumptions = result.high_risk_assumptions || []
  const rewrite     = result.rewrite

  const scoreRows = [
    { key: 'section_completeness', label: 'Section Completeness' },
    { key: 'writing_quality',      label: 'Writing Quality' },
    { key: 'scope_clarity',        label: 'Scope Clarity' },
    { key: 'client_coverage',      label: 'Client Coverage' },
    { key: 'overall',              label: 'Overall — NCR1' },
  ]

  return (
    <div className="space-y-5">
      <div><SecHead title="Score Breakdown" /><ScoreTable scores={sc} rows={scoreRows} /></div>

      {/* Section audit */}
      {audit.length > 0 && (
        <div>
          <SecHead title="Section Completeness Audit" count={audit.length} />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Section</th>
                  <th className="text-center text-gray-600 font-normal px-3 py-2 w-20">Mandatory</th>
                  <th className="text-center text-gray-600 font-normal px-3 py-2 w-24">Status</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((item, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-gray-200">{item.section || item.id || '—'}</td>
                    <td className="px-3 py-2.5 text-center">{item.mandatory ? <span className="text-indigo-400">✓</span> : <span className="text-gray-700">—</span>}</td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px] max-w-xs truncate">{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Writing issues */}
      <div>
        <SecHead title="Writing Issues" count={writing.length}
          countCls={writing.length ? 'bg-red-900/50 text-red-300 border-red-800' : undefined} />
        {writing.length === 0
          ? <GreenNotice msg="No writing issues identified." />
          : <div className="space-y-2">
              {writing.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.type && <span className="text-xs text-gray-400 font-medium">{issue.type}</span>}
                    {issue.location && <span className="text-[10px] text-gray-600 font-mono">{issue.location}</span>}
                  </div>
                  {issue.quote && (
                    <blockquote className="border-l-2 border-gray-700 pl-3 text-xs text-gray-400 italic my-2 leading-relaxed">"{issue.quote}"</blockquote>
                  )}
                  {issue.why && <p className="text-xs text-gray-400 mt-1"><span className="text-gray-600">Why: </span>{issue.why}</p>}
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Scope clarity */}
      <div>
        <SecHead title="Scope Clarity Issues" count={scope.length}
          countCls={scope.length ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' : undefined} />
        {scope.length === 0
          ? <GreenNotice msg="No scope clarity issues found." />
          : <div className="space-y-2">
              {scope.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2"><SevBadge severity={issue.severity} /></div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                  {issue.recommendation && (
                    <p className="text-xs text-blue-300 mt-2 bg-blue-950/30 rounded px-2.5 py-1.5">
                      <span className="text-blue-500 font-mono">→ </span>{issue.recommendation}
                    </p>
                  )}
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* High-risk assumptions */}
      {assumptions.length > 0 && (
        <div>
          <SecHead title="High-Risk Assumptions" count={assumptions.length}
            countCls="bg-orange-900/50 text-orange-300 border-orange-800" />
          <div className="space-y-2">
            {assumptions.map((a, i) => (
              <div key={i} className="bg-gray-950 border border-orange-900/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-orange-300 mb-1">{a.assumption}</p>
                {a.location && <p className="text-[10px] text-gray-600 font-mono mb-1">{a.location}</p>}
                {a.risk_if_wrong && <p className="text-xs text-gray-400"><span className="text-red-400">Risk: </span>{a.risk_if_wrong}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewrite */}
      {rewrite && (
        <div>
          <SecHead title="Rewrite Suggestion" />
          <div className="bg-gray-950 border border-indigo-900/40 rounded-xl p-4 space-y-3">
            <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">{rewrite.section}</p>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Original</p>
              <blockquote className="border-l-2 border-gray-700 pl-3 text-xs text-gray-500 italic leading-relaxed">{rewrite.original}</blockquote>
            </div>
            <div>
              <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1.5">Improved</p>
              <p className="text-xs text-gray-200 leading-relaxed bg-indigo-950/20 border border-indigo-900/30 rounded-lg px-3 py-2.5">{rewrite.improved}</p>
            </div>
            {rewrite.what_changed && (
              <p className="text-xs text-gray-500 italic"><span className="text-gray-600">What changed: </span>{rewrite.what_changed}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── NCR2 Panel (mirrors Agent2Panel) ─────────────────────────────────────────

function NCR2Panel({ result, overallScore }) {
  if (!result) return <p className="text-sm text-gray-500 py-10 text-center">NCR2 (Commercial Strength) output not available for this session.</p>

  const sc          = { ...(result.scores || {}), ...(overallScore != null ? { overall: overallScore } : {}) }
  const phases      = result.phase_coverage || []
  const estIssues   = result.estimation_issues || []
  const priceIssues = result.pricing_issues || []
  const arith       = result.arithmetic_checks || []

  const scoreRows = [
    { key: 'estimation_rigour',    label: 'Estimation Rigour' },
    { key: 'phase_coverage',       label: 'Phase Coverage' },
    { key: 'pricing_completeness', label: 'Pricing Completeness' },
    { key: 'overall',              label: 'Overall — NCR2' },
  ]

  return (
    <div className="space-y-5">
      <div><SecHead title="Score Breakdown" /><ScoreTable scores={sc} rows={scoreRows} /></div>

      {/* Phase coverage */}
      <div>
        <SecHead title="Delivery Phase Coverage" count={phases.length}
          countCls={phases.some(p => p.status === 'ABSENT') ? 'bg-red-900/50 text-red-300 border-red-800' : undefined} />
        {phases.length === 0
          ? <GreenNotice msg="No phase coverage data available." />
          : <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-600 font-normal px-4 py-2">Phase</th>
                    <th className="text-center text-gray-600 font-normal px-3 py-2 w-28">Status</th>
                    <th className="text-left text-gray-600 font-normal px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-2.5 text-gray-200">{p.phase || '—'}</td>
                      <td className="px-3 py-2.5 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-3 py-2.5 text-gray-500 text-[11px] max-w-xs truncate">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Estimation issues */}
      <div>
        <SecHead title="Estimation Issues" count={estIssues.length}
          countCls={estIssues.length ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' : undefined} />
        {estIssues.length === 0
          ? <GreenNotice msg="No estimation issues found." />
          : <div className="space-y-2">
              {estIssues.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.location && <span className="text-[10px] font-mono text-gray-500">{issue.location}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                  {issue.recommendation && (
                    <p className="text-xs text-blue-300 mt-2 bg-blue-950/30 rounded px-2.5 py-1.5">
                      <span className="text-blue-500 font-mono">→ </span>{issue.recommendation}
                    </p>
                  )}
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Pricing issues */}
      <div>
        <SecHead title="Pricing Issues" count={priceIssues.length}
          countCls={priceIssues.length ? 'bg-orange-900/50 text-orange-300 border-orange-800' : undefined} />
        {priceIssues.length === 0
          ? <GreenNotice msg="No pricing issues found." />
          : <div className="space-y-2">
              {priceIssues.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.location && <span className="text-[10px] font-mono text-gray-500">{issue.location}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                  {issue.recommendation && (
                    <p className="text-xs text-blue-300 mt-2 bg-blue-950/30 rounded px-2.5 py-1.5">
                      <span className="text-blue-500 font-mono">→ </span>{issue.recommendation}
                    </p>
                  )}
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Arithmetic checks */}
      <div>
        <SecHead title="Arithmetic Checks" count={arith.length} />
        {arith.length === 0
          ? <GreenNotice msg="All arithmetic checks passed." />
          : <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-600 font-normal px-4 py-2">Check</th>
                    <th className="text-left text-gray-600 font-normal px-3 py-2 w-28">Result</th>
                    <th className="text-left text-gray-600 font-normal px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {arith.map((c, i) => {
                    const color = c.result === 'PASS' ? 'text-green-400' : c.result === 'FLAG' ? 'text-red-400' : 'text-gray-500'
                    return (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0">
                        <td className="px-4 py-2.5 text-gray-300 font-mono text-[11px]">{c.check || '—'}</td>
                        <td className={clsx('px-3 py-2.5 font-mono font-bold text-[11px]', color)}>{c.result || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-400 text-[11px]">{c.detail || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  )
}

// ── NCR3 Panel (mirrors Agent3Panel) ─────────────────────────────────────────

function NCR3Panel({ result, overallScore }) {
  if (!result) return <p className="text-sm text-gray-500 py-10 text-center">NCR3 (Competitive Position) output not available for this session.</p>

  const sc        = { ...(result.scores || {}), ...(overallScore != null ? { overall: overallScore } : {}) }
  const diff      = result.differentiation
  const narr      = result.narrative_assessment
  const clientFit = result.client_fit_issues || []
  const risk      = result.risk_transparency_issues || []
  const cred      = result.credibility_gaps || []
  const overclaim = result.overclaiming_flags || []
  const industry  = result.industry_findings || []

  const scoreRows = [
    { key: 'client_fit',        label: 'Client Fit' },
    { key: 'differentiation',   label: 'Differentiation' },
    { key: 'risk_transparency', label: 'Risk Transparency' },
    { key: 'credibility',       label: 'Credibility' },
    { key: 'narrative',         label: 'Narrative' },
    { key: 'industry_factors',  label: 'Industry Factors' },
    { key: 'overall',           label: 'Overall — NCR3' },
  ]

  return (
    <div className="space-y-5">
      <div><SecHead title="Score Breakdown" /><ScoreTable scores={sc} rows={scoreRows} /></div>

      {/* Differentiation */}
      {diff && (
        <div>
          <SecHead title="Differentiation Assessment" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className={clsx('text-sm font-medium', diff.sounds_generic ? 'text-yellow-300' : 'text-green-300')}>
              {diff.sounds_generic ? '⚠ Proposal sounds somewhat generic' : '✓ Has genuine differentiators'}
            </p>
            {diff.differentiators_found?.length > 0 && (
              <div>
                <p className="text-[10px] text-green-500 uppercase tracking-wider mb-1.5">Genuine Differentiators</p>
                <ul className="space-y-1">
                  {diff.differentiators_found.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.generic_elements?.length > 0 && (
              <div>
                <p className="text-[10px] text-yellow-500 uppercase tracking-wider mb-1.5">Generic Elements</p>
                <ul className="space-y-1">
                  {diff.generic_elements.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-yellow-300">
                      <span className="flex-shrink-0">⚠</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Narrative assessment */}
      {narr && (
        <div>
          <SecHead title="Narrative Assessment" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2.5">
            {[
              { key: 'flows_as_story',         label: 'Flows as a coherent story' },
              { key: 'exec_summary_compelling', label: 'Executive summary is compelling' },
              { key: 'clear_why_us',            label: 'Clear "Why Us" differentiation' },
              { key: 'clear_next_step',         label: 'Clear next step / call to action' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                {narr[key]
                  ? <span className="text-xs text-green-400 font-mono">✓ Yes</span>
                  : <span className="text-xs text-red-400 font-mono">✕ No</span>}
              </div>
            ))}
            {narr.narrative_gaps?.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Gaps</p>
                <ul className="space-y-1">
                  {narr.narrative_gaps.map((g, i) => (
                    <li key={i} className="text-xs text-yellow-300 flex items-start gap-2">
                      <span className="flex-shrink-0">⚠</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client fit issues */}
      <div>
        <SecHead title="Client Fit Issues" count={clientFit.length}
          countCls={clientFit.length ? 'bg-red-900/50 text-red-300 border-red-800' : undefined} />
        {clientFit.length === 0
          ? <GreenNotice msg="No client fit issues found." />
          : <div className="space-y-2">
              {clientFit.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.priority && <span className="text-xs text-indigo-400 font-medium">Priority: {issue.priority}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                  {issue.recommendation && (
                    <p className="text-xs text-blue-300 mt-2 bg-blue-950/30 rounded px-2.5 py-1.5">
                      <span className="text-blue-500 font-mono">→ </span>{issue.recommendation}
                    </p>
                  )}
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Risk transparency */}
      <div>
        <SecHead title="Risk & Dependency Transparency" count={risk.length}
          countCls={risk.length ? 'bg-orange-900/50 text-orange-300 border-orange-800' : undefined} />
        {risk.length === 0
          ? <GreenNotice msg="No risk transparency issues found." />
          : <div className="space-y-2">
              {risk.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.type && <span className="text-[10px] font-mono text-gray-500">{issue.type}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Credibility gaps */}
      <div>
        <SecHead title="Credibility Gaps" count={cred.length}
          countCls={cred.length ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' : undefined} />
        {cred.length === 0
          ? <GreenNotice msg="No credibility gaps found." />
          : <div className="space-y-2">
              {cred.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.type && <span className="text-[10px] font-mono text-gray-500">{issue.type}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{issue.issue}</p>
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Overclaiming flags */}
      {overclaim.length > 0 && (
        <div>
          <SecHead title="Overclaiming Flags" count={overclaim.length}
            countCls="bg-red-900/50 text-red-300 border-red-800" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Claim</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Location</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
                </tr>
              </thead>
              <tbody>
                {overclaim.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-red-300 text-[11px] italic">"{f.claim}"</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-[11px]">{f.location || '—'}</td>
                    <td className="px-3 py-2.5"><SevBadge severity={f.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Industry win factors */}
      {industry.length > 0 && (
        <div>
          <SecHead title="Industry Win Factors" count={industry.length}
            countCls="bg-teal-900/50 text-teal-300 border-teal-800" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Factor</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-32">Finding</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
                </tr>
              </thead>
              <tbody>
                {industry.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-teal-300 text-[11px]">{f.factor || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300 font-mono text-[11px]">{f.finding || '—'}</td>
                    <td className="px-3 py-2.5">{f.severity ? <SevBadge severity={f.severity} /> : <span className="text-gray-700">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── NC4 Panel (mirrors Agent4Panel) ──────────────────────────────────────────

function NC4Panel({ adapted, nc3Results, nc2Output }) {
  if (!adapted) return <p className="text-sm text-gray-500 py-10 text-center">No data available.</p>
  return (
    <div className="space-y-4">
      <VerdictBanner
        overallScore={adapted.overall_score}   verdict={adapted.verdict}
        agent1Score={adapted.agent1_score}     agent2Score={adapted.agent2_score}
        agent3Score={adapted.agent3_score}     weightLabel={adapted.weight_label}
        weightAdjusted={adapted.weight_adjusted} weightReason={adapted.weight_reason}
      />
      {adapted.plain_english_summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Executive Briefing</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{adapted.plain_english_summary}</p>
        </div>
      )}
      {adapted.top_3_strengths?.length > 0 && <TopStrengths strengths={adapted.top_3_strengths} />}
      <DoubleFlaggedIssues issues={adapted.double_flagged_issues} />
      <PriorityActionList priorityActions={adapted.priority_actions} hideTiers={['internal']} />
      <ScoreRadar sectionScorecard={adapted.section_scorecard} />
      <CrossConsistencyPanel issues={adapted.cross_consistency_issues} />
      {nc3Results.length > 0 && <CustomChecklistGrid nc3Results={nc3Results} nc2Output={nc2Output} />}
    </div>
  )
}

// ── Tab config (identical visual style to standard InDepthView) ───────────────

const TABS = [
  { key: 'ncr1', label: 'NCR1', sub: 'Clarity & Completeness',  color: 'indigo' },
  { key: 'ncr2', label: 'NCR2', sub: 'Commercial Strength',      color: 'purple' },
  { key: 'ncr3', label: 'NCR3', sub: 'Competitive Position',     color: 'teal'   },
  { key: 'nc4',  label: 'NC4',  sub: 'Final Verdict Report',     color: 'orange' },
]

const ACTIVE_CLS = {
  indigo: 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/25',
  purple: 'border-b-2 border-purple-500 text-purple-300 bg-purple-950/25',
  teal:   'border-b-2 border-teal-500   text-teal-300   bg-teal-950/25',
  orange: 'border-b-2 border-orange-500 text-orange-300 bg-orange-950/25',
}
const DOT_CLS = {
  indigo: 'bg-indigo-500', purple: 'bg-purple-500', teal: 'bg-teal-500', orange: 'bg-orange-500',
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CustomInDepthView({ output, session }) {
  // Default to nc4 tab (same as Agent4 being default in standard InDepthView)
  const [tab, setTab] = useState('nc4')

  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const nc3Results = session?.agent3_output || []
  const nc2Output  = session?.agent2_output || {}

  // Full NCR results stored by NC4
  const specResults = output.specialist_results || {}
  const ncr1Result  = specResults.ncr1?.status === 'complete' ? specResults.ncr1?.result : null
  const ncr2Result  = specResults.ncr2?.status === 'complete' ? specResults.ncr2?.result : null
  const ncr3Result  = specResults.ncr3?.status === 'complete' ? specResults.ncr3?.result : null

  // adapted is session.agent4_output passed through the adapter — used by NC4 panel
  // The raw nc4 output is `output`; we get the adapted version from enrichedSession
  const adapted = session?.agent4_output   // CustomResultsPage passes adapted in enrichedSession

  return (
    <div className="space-y-5 pb-8" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>

      {/* Score traceability always visible at top */}
      <ScoreTraceability
        ncr1Result={ncr1Result}
        ncr2Result={ncr2Result}
        ncr3Result={ncr3Result}
        categoryScores={output.category_scores}
        sectionScorecard={output.section_scorecard}
      />

      {/* Agent tabs — same visual style as standard InDepthView */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gray-800 bg-gray-950">
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-0.5 px-3 py-3.5 text-center transition-all duration-200',
                  active ? ACTIVE_CLS[t.color] : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div className={clsx('w-2 h-2 rounded-full transition-colors', active ? DOT_CLS[t.color] : 'bg-gray-700')} />
                  <span className="text-xs font-semibold">{t.label}</span>
                </div>
                <span className="text-[10px] opacity-60">{t.sub}</span>
              </button>
            )
          })}
        </div>

        {/* Content — key forces remount on tab change for fresh animations */}
        <div className="p-5" key={tab}>
          {tab === 'ncr1' && <NCR1Panel result={ncr1Result} overallScore={output.specialist_scores?.clarity_completeness} />}
          {tab === 'ncr2' && <NCR2Panel result={ncr2Result} overallScore={output.specialist_scores?.commercial_strength} />}
          {tab === 'ncr3' && <NCR3Panel result={ncr3Result} overallScore={output.specialist_scores?.competitive_position} />}
          {tab === 'nc4'  && <NC4Panel  adapted={adapted} nc3Results={nc3Results} nc2Output={nc2Output} />}
        </div>
      </div>
    </div>
  )
}
