import { useState } from 'react'
import { clsx } from 'clsx'
import VerdictBanner      from '../agent4/VerdictBanner'
import ScoreRadar         from '../agent4/ScoreRadar'
import PriorityActionList from '../agent4/PriorityActionList'
import FullChecklistGrid  from '../agent4/FullChecklistGrid'
import CrossConsistencyPanel from '../agent4/CrossConsistencyPanel'
import DoubleFlaggedIssues   from '../agent4/DoubleFlaggedIssues'
import TopStrengths          from '../agent4/TopStrengths'
import RewriteSuggestions    from '../agent4/RewriteSuggestions'

// ── Shared primitives ─────────────────────────────────────────────────────────

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
    PARTIAL: 'bg-yellow-900/70 text-yellow-300 border-yellow-700',
    MISSING: 'bg-red-900/70 text-red-300 border-red-700',
    PRESENT: 'bg-green-900/70 text-green-300 border-green-700',
    WEAK:    'bg-yellow-900/70 text-yellow-300 border-yellow-700',
  }
  const icon = { COVERED: '✓', PRESENT: '✓', PARTIAL: '~', WEAK: '~', MISSING: '✕' }
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
          {rows.map(({ key, label, weight }) => {
            const val = scores[key]
            if (val == null) return null
            const color = val >= 7 ? '#34d399' : val >= 5 ? '#fbbf24' : '#f87171'
            return (
              <tr key={key} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-2.5 text-gray-300">
                  {label}
                  {weight && <span className="text-gray-600 ml-1.5 text-[10px]">({weight})</span>}
                </td>
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

// ── Agent 1 Panel ──────────────────────────────────────────────────────────────

function Agent1Panel({ output }) {
  if (!output) return <p className="text-sm text-gray-500 py-10 text-center">Agent 1 output not available.</p>

  const sc          = output.scores || {}
  const audit       = output.section_audit || []
  const writing     = output.writing_issues || []
  const scope       = output.scope_clarity_issues || []
  const assumptions = output.high_risk_assumptions || []
  const gaps        = output.client_specific_gaps || []
  const jargon      = output.jargon_flags || []

  const scoreRows = [
    { key: 'section_completeness', label: 'Section Completeness' },
    { key: 'writing_quality',      label: 'Writing Quality' },
    { key: 'scope_clarity',        label: 'Scope Clarity' },
    { key: 'client_coverage',      label: 'Client Coverage' },
    { key: 'overall',              label: 'Overall — Agent 1' },
  ]

  return (
    <div className="space-y-5">

      {/* Scores */}
      <div>
        <SecHead title="Score Breakdown" />
        <ScoreTable scores={sc} rows={scoreRows} />
      </div>

      {/* Section audit */}
      {audit.length > 0 && (
        <div>
          <SecHead title="Section Audit Checklist" count={audit.length} />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2 w-14">ID</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Section</th>
                  <th className="text-center text-gray-600 font-normal px-3 py-2 w-20">Mandatory</th>
                  <th className="text-center text-gray-600 font-normal px-3 py-2 w-24">Status</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((item, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-500">{item.id || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-200">{item.section || item.topic || '—'}</td>
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
                    <blockquote className="border-l-2 border-gray-700 pl-3 text-xs text-gray-400 italic my-2 leading-relaxed">
                      "{issue.quote}"
                    </blockquote>
                  )}
                  {issue.why && <p className="text-xs text-gray-400 mt-1"><span className="text-gray-600">Why: </span>{issue.why}</p>}
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

      {/* Jargon flags */}
      {jargon.length > 0 && (
        <div>
          <SecHead title="Jargon Flags" count={jargon.length}
            countCls="bg-purple-900/50 text-purple-300 border-purple-800" />
          <div className="space-y-2">
            {jargon.map((f, i) => (
              <div key={i} className="bg-gray-950 border border-purple-900/40 rounded-xl p-4">
                {f.passage && (
                  <blockquote className="border-l-2 border-purple-700 pl-3 text-xs text-gray-400 italic mb-2 leading-relaxed">
                    "{f.passage}…"
                  </blockquote>
                )}
                {f.jargon_terms?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[10px] text-gray-600 self-center mr-1">Terms:</span>
                    {f.jargon_terms.map(t => (
                      <span key={t} className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
                {f.plain_language_suggestion && (
                  <p className="text-xs text-blue-300 bg-blue-950/30 rounded px-2.5 py-1.5">
                    <span className="text-blue-500 font-mono">→ </span>{f.plain_language_suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry gaps */}
      {gaps.length > 0 && (
        <div>
          <SecHead title="Industry-Specific Gaps" count={gaps.length}
            countCls="bg-teal-900/50 text-teal-300 border-teal-800" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Industry Lens</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Gap</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-teal-300 font-mono text-[11px]">{g.industry_lens || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300">{g.gap || '—'}</td>
                    <td className="px-3 py-2.5"><SevBadge severity={g.severity} /></td>
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

// ── Agent 2 Panel ──────────────────────────────────────────────────────────────

function Agent2Panel({ output }) {
  if (!output) return <p className="text-sm text-gray-500 py-10 text-center">Agent 2 output not available.</p>

  const sc           = output.scores || {}
  const cma          = output.commercial_model_assessment
  const missingPhases = output.missing_phases || []
  const estIssues    = output.estimation_issues || []
  const priceIssues  = output.pricing_issues || []
  const arith        = output.arithmetic_flags || []
  const internal     = output.internal_flags || []

  const scoreRows = [
    { key: 'estimation_rigour',    label: 'Estimation Rigour',    weight: '30%' },
    { key: 'phase_coverage',       label: 'Phase Coverage',       weight: '30%' },
    { key: 'pricing_completeness', label: 'Pricing Completeness', weight: '20%' },
    { key: 'commercial_model_fit', label: 'Commercial Model Fit', weight: '10%' },
    { key: 'arithmetic_accuracy',  label: 'Arithmetic Accuracy',  weight: '10%' },
    { key: 'overall',              label: 'Overall — Agent 2' },
  ]

  return (
    <div className="space-y-5">

      <div><SecHead title="Score Breakdown" /><ScoreTable scores={sc} rows={scoreRows} /></div>

      {/* Commercial model */}
      {cma && (
        <div>
          <SecHead title="Commercial Model Assessment" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Model stated</span>
              <span className="font-mono text-white">{cma.model_stated || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Appropriate for scope</span>
              {cma.appropriate_for_scope
                ? <span className="text-green-400">✓ Yes</span>
                : <span className="text-red-400">✕ No</span>}
            </div>
            {cma.concerns?.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Concerns</p>
                <ul className="space-y-1">
                  {cma.concerns.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-yellow-500 mt-0.5">⚠</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing phases */}
      <div>
        <SecHead title="Missing / Uncosted Phases" count={missingPhases.length}
          countCls={missingPhases.length ? 'bg-red-900/50 text-red-300 border-red-800' : undefined} />
        {missingPhases.length === 0
          ? <GreenNotice msg="No missing phases identified." />
          : <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Checklist Item</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Phase</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
                </tr></thead>
                <tbody>
                  {missingPhases.map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-4 py-2.5 text-gray-300 font-mono text-[11px]">{p.gsk_item || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-200">{p.phase || '—'}</td>
                      <td className="px-3 py-2.5"><SevBadge severity={p.severity} /></td>
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
                    {issue.gsk_item && <span className="text-[10px] font-mono text-gray-500">{issue.gsk_item}</span>}
                    {issue.skill && <span className="text-[10px] text-purple-400 font-mono">Skill {issue.skill}</span>}
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
                    {issue.gsk_item && <span className="text-[10px] font-mono text-gray-500">{issue.gsk_item}</span>}
                    {issue.skill && <span className="text-[10px] text-purple-400 font-mono">Skill {issue.skill}</span>}
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

      {/* Arithmetic */}
      <div>
        <SecHead title="Arithmetic Checks" count={arith.length} />
        {arith.length === 0
          ? <GreenNotice msg="All arithmetic checks passed." />
          : <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-800">
                  <th className="text-left text-gray-600 font-normal px-4 py-2">Check</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2">Finding</th>
                  <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
                </tr></thead>
                <tbody>
                  {arith.map((f, i) => (
                    <tr key={i} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-4 py-2.5 text-gray-300 font-mono text-[11px]">{f.check || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-300">{f.finding || '—'}</td>
                      <td className="px-3 py-2.5"><SevBadge severity={f.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* Internal flags */}
      {internal.length > 0 && (
        <div>
          <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-2.5 mb-3">
            <span className="text-amber-400">⚠</span>
            <span className="text-xs text-amber-300 font-medium">Internal Section — Not for Client</span>
          </div>
          <div className="space-y-2">
            {internal.map((f, i) => (
              <div key={i} className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <SevBadge severity={f.severity} />
                  <span className="text-xs text-gray-400 font-mono">{f.check}</span>
                </div>
                <p className="text-xs text-gray-300">{f.finding}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Agent 3 Panel ──────────────────────────────────────────────────────────────

function Agent3Panel({ output }) {
  if (!output) return <p className="text-sm text-gray-500 py-10 text-center">Agent 3 output not available.</p>

  const sc          = output.scores || {}
  const diff        = output.differentiation
  const narr        = output.narrative_assessment
  const clientFit   = output.client_fit_issues || []
  const risk        = output.risk_transparency_issues || []
  const cred        = output.credibility_gaps || []
  const overclaim   = output.overclaiming_flags || []
  const industry    = output.industry_findings || []
  const checklist   = output.checklist_coverage || []

  const scoreRows = [
    { key: 'client_fit',        label: 'Client Fit' },
    { key: 'differentiation',   label: 'Differentiation' },
    { key: 'risk_transparency', label: 'Risk Transparency' },
    { key: 'credibility',       label: 'Credibility' },
    { key: 'narrative',         label: 'Narrative' },
    { key: 'industry_factors',  label: 'Industry Factors' },
    { key: 'overall',           label: 'Overall — Agent 3' },
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
              <div className="pt-2 border-t border-gray-800">
                <p className="text-[10px] text-yellow-500 uppercase tracking-wider mb-1.5">Generic Elements to Fix</p>
                <ul className="space-y-1">
                  {diff.generic_elements.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-yellow-500 flex-shrink-0 mt-0.5">⚠</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Narrative */}
      {narr && (
        <div>
          <SecHead title="Narrative Flow" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                ['flows_as_story',           'Flows as a coherent story'],
                ['exec_summary_compelling',  'Executive summary is compelling'],
                ['clear_why_us',             'Clear "why us" message'],
                ['clear_next_step',          'Clear next step defined'],
              ].map(([key, lbl]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={narr[key] ? 'text-green-400' : 'text-red-400'}>{narr[key] ? '✓' : '✕'}</span>
                  <span className={narr[key] ? 'text-green-300' : 'text-red-300'}>{lbl}</span>
                </div>
              ))}
            </div>
            {narr.narrative_gaps?.length > 0 && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Narrative Gaps</p>
                <ul className="space-y-1">
                  {narr.narrative_gaps.map((g, i) => (
                    <li key={i} className="text-xs text-gray-400">• {g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client fit issues */}
      <div>
        <SecHead title="Client Priority Gaps" count={clientFit.length}
          countCls={clientFit.length ? 'bg-red-900/50 text-red-300 border-red-800' : undefined} />
        {clientFit.length === 0
          ? <GreenNotice msg="No client priority gaps found." />
          : <div className="space-y-2">
              {clientFit.map((issue, i) => (
                <IssueCard key={i} severity={issue.severity}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SevBadge severity={issue.severity} />
                    {issue.priority && <span className="text-xs text-teal-300 font-medium">{issue.priority}</span>}
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
                  <div className="flex items-center gap-2 mb-2">
                    <SevBadge severity={issue.severity} />
                    {issue.gsk_item && <span className="text-[10px] font-mono text-gray-500">{issue.gsk_item}</span>}
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
          countCls={cred.length ? 'bg-purple-900/50 text-purple-300 border-purple-800' : undefined} />
        {cred.length === 0
          ? <GreenNotice msg="No credibility gaps identified." />
          : <div className="space-y-2">
              {cred.map((gap, i) => (
                <IssueCard key={i} severity={gap.severity}>
                  <div className="flex items-center gap-2 mb-2">
                    <SevBadge severity={gap.severity} />
                    {gap.gsk_item && <span className="text-[10px] font-mono text-gray-500">{gap.gsk_item}</span>}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{gap.issue}</p>
                </IssueCard>
              ))}
            </div>
        }
      </div>

      {/* Overclaiming */}
      {overclaim.length > 0 && (
        <div>
          <SecHead title="Overclaiming Flags" count={overclaim.length}
            countCls="bg-yellow-900/50 text-yellow-300 border-yellow-800" />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800">
                <th className="text-left text-gray-600 font-normal px-4 py-2">Claim</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2 w-36">Location</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
              </tr></thead>
              <tbody>
                {overclaim.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-300 italic">"{f.claim}"</td>
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
          <SecHead title="Industry Win Factors" count={industry.length} />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800">
                <th className="text-left text-gray-600 font-normal px-4 py-2">Factor</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2 w-28">Finding</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2 w-24">Severity</th>
              </tr></thead>
              <tbody>
                {industry.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-2.5 text-gray-300">{f.factor || '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={f.finding} /></td>
                    <td className="px-3 py-2.5"><SevBadge severity={f.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent 3 checklist */}
      {checklist.length > 0 && (
        <div>
          <SecHead title="Proposal Checklist Coverage (Agent 3)" count={checklist.length} />
          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-800">
                <th className="text-left text-gray-600 font-normal px-4 py-2 w-12">ID</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2">Topic</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2 w-16">Skill</th>
                <th className="text-center text-gray-600 font-normal px-3 py-2 w-24">Status</th>
                <th className="text-left text-gray-600 font-normal px-3 py-2">Note</th>
              </tr></thead>
              <tbody>
                {checklist.map((item, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 font-mono text-gray-500">{item.id || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-200">{item.topic || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-teal-400 text-[11px]">{item.skill || '—'}</td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px] max-w-xs truncate">{item.note || '—'}</td>
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

// ── Agent 4 Panel (re-uses existing components) ────────────────────────────────

function Agent4Panel({ output }) {
  if (!output) return <p className="text-sm text-gray-500 py-10 text-center">No data available.</p>
  return (
    <div className="space-y-4">
      <VerdictBanner
        overallScore={output.overall_score}    verdict={output.verdict}
        agent1Score={output.agent1_score}      agent2Score={output.agent2_score}
        agent3Score={output.agent3_score}      weightLabel={output.weight_label}
        weightAdjusted={output.weight_adjusted} weightReason={output.weight_reason}
      />
      {output.plain_english_summary && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Executive Briefing</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{output.plain_english_summary}</p>
        </div>
      )}
      {output.top_3_strengths?.length > 0 && <TopStrengths strengths={output.top_3_strengths} />}
      <DoubleFlaggedIssues issues={output.double_flagged_issues} />
      <PriorityActionList priorityActions={output.priority_actions} />
      <ScoreRadar sectionScorecard={output.section_scorecard} />
      <CrossConsistencyPanel issues={output.cross_consistency_issues} />
      <FullChecklistGrid checklistCoverage={output.checklist_coverage} />
      {output.rewrite_suggestions?.length > 0 && <RewriteSuggestions suggestions={output.rewrite_suggestions} />}
    </div>
  )
}

// ── Score traceability table ───────────────────────────────────────────────────

function ScoreTraceability({ output, a1, a2, a3 }) {
  if (!output?.section_scorecard) return null
  const sc = output.section_scorecard

  const dims = [
    { key: 'section_completeness', label: 'Section Completeness', a1k: 'section_completeness' },
    { key: 'writing_quality',      label: 'Writing Quality',      a1k: 'writing_quality' },
    { key: 'scope_clarity',        label: 'Scope Clarity',        a1k: 'scope_clarity' },
    { key: 'estimation_rigour',    label: 'Estimation Rigour',    a2k: 'estimation_rigour' },
    { key: 'phase_coverage',       label: 'Phase Coverage',       a2k: 'phase_coverage' },
    { key: 'pricing_completeness', label: 'Pricing Completeness', a2k: 'pricing_completeness' },
    { key: 'client_fit',           label: 'Client Fit',           a3k: 'client_fit' },
    { key: 'differentiation',      label: 'Differentiation',      a3k: 'differentiation' },
    { key: 'risk_transparency',    label: 'Risk Transparency',    a3k: 'risk_transparency' },
    { key: 'credibility',          label: 'Credibility',          a3k: 'credibility' },
    { key: 'narrative',            label: 'Narrative',            a3k: 'narrative' },
  ]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Score Traceability
        </h3>
        <p className="text-[11px] text-gray-600 mt-0.5">
          Which specialist agent contributed to each final dimension score
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-600 font-normal px-4 py-2.5">Dimension</th>
              <th className="text-center text-indigo-500/70 font-mono font-normal px-3 py-2.5 w-16">A1</th>
              <th className="text-center text-purple-500/70 font-mono font-normal px-3 py-2.5 w-16">A2</th>
              <th className="text-center text-teal-500/70 font-mono font-normal px-3 py-2.5 w-16">A3</th>
              <th className="text-center text-orange-500/70 font-mono font-normal px-3 py-2.5 w-20">Final</th>
              <th className="text-left text-gray-600 font-normal px-3 py-2.5 w-36">Bar</th>
            </tr>
          </thead>
          <tbody>
            {dims.map(dim => {
              const final = sc[dim.key]
              if (final == null) return null
              const a1v = dim.a1k ? a1?.scores?.[dim.a1k] : null
              const a2v = dim.a2k ? a2?.scores?.[dim.a2k] : null
              const a3v = dim.a3k ? a3?.scores?.[dim.a3k] : null
              const color = final >= 7 ? '#34d399' : final >= 5 ? '#fbbf24' : '#f87171'
              return (
                <tr key={dim.key} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-gray-300">{dim.label}</td>
                  <td className="px-3 py-2.5 text-center">{a1v != null ? <span className="font-mono text-indigo-400">{a1v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">{a2v != null ? <span className="font-mono text-purple-400">{a2v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">{a3v != null ? <span className="font-mono text-teal-400">{a3v.toFixed(1)}</span> : <span className="text-gray-700">—</span>}</td>
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

// ── Tab config ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'a1', label: 'Agent 1', sub: 'Completeness & Clarity',     color: 'indigo' },
  { key: 'a2', label: 'Agent 2', sub: 'Estimation & Commercial',     color: 'purple' },
  { key: 'a3', label: 'Agent 3', sub: 'Competitive Strength',        color: 'teal'   },
  { key: 'a4', label: 'Agent 4', sub: 'Final Verdict Report',        color: 'orange' },
]

const ACTIVE_CLS = {
  indigo: 'border-b-2 border-indigo-500 text-indigo-300 bg-indigo-950/25',
  purple: 'border-b-2 border-purple-500 text-purple-300 bg-purple-950/25',
  teal:   'border-b-2 border-teal-500 text-teal-300 bg-teal-950/25',
  orange: 'border-b-2 border-orange-500 text-orange-300 bg-orange-950/25',
}
const DOT_CLS = {
  indigo: 'bg-indigo-500', purple: 'bg-purple-500', teal: 'bg-teal-500', orange: 'bg-orange-500',
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function InDepthView({ output, session }) {
  const [tab, setTab] = useState('a4')

  if (!output) return <p className="text-gray-500 text-sm py-8 text-center">No data available.</p>

  const a1 = session?.agent1_output
  const a2 = session?.agent2_output
  const a3 = session?.agent3_output

  return (
    <div className="space-y-5 pb-8">

      {/* Score traceability always visible at top */}
      <ScoreTraceability output={output} a1={a1} a2={a2} a3={a3} />

      {/* Agent tabs */}
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
          {tab === 'a1' && <Agent1Panel output={a1} />}
          {tab === 'a2' && <Agent2Panel output={a2} />}
          {tab === 'a3' && <Agent3Panel output={a3} />}
          {tab === 'a4' && <Agent4Panel output={output} />}
        </div>
      </div>
    </div>
  )
}
