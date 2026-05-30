// ── Trigger helpers ───────────────────────────────────────────────────────────

function triggerDownload(content, filename, mime = 'text/html') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Opens the HTML report in a new tab and immediately triggers the browser's
 * Print dialog. The user selects "Save as PDF" (default destination on most
 * modern browsers — Chrome, Edge, Firefox, Safari all support this).
 *
 * Why this approach instead of a PDF library:
 *   • Zero npm dependencies — no jsPDF / html2canvas bloat
 *   • The browser renders the HTML perfectly (real fonts, real layout)
 *   • Output text is selectable / searchable in the PDF
 *   • The @media print CSS already produces a clean white-background document
 *
 * Popup-blocked fallback: downloads the HTML file so nothing is lost.
 */
function openAsPDF(htmlContent) {
  // Inject auto-print script + a visible hint tooltip in the new window
  const injected = htmlContent.replace('</body>', `
  <style>
    @media screen {
      #_pdf_hint {
        position:fixed;bottom:20px;right:20px;
        background:#1e40af;color:#fff;
        padding:14px 18px;border-radius:12px;
        font-size:13px;font-family:system-ui,sans-serif;
        box-shadow:0 4px 24px rgba(0,0,0,.5);
        z-index:9999;line-height:1.7;max-width:280px;
      }
      #_pdf_hint kbd {
        background:#1d4ed8;border:1px solid #3b82f6;
        padding:1px 6px;border-radius:4px;font-size:11px;
      }
    }
    @media print { #_pdf_hint { display:none !important; } }
  </style>
  <div id="_pdf_hint">
    📄 <strong>Save as PDF</strong><br>
    <small>
      The print dialog should open automatically.<br>
      If not, press <kbd>Ctrl+P</kbd> (Win) or <kbd>⌘+P</kbd> (Mac),<br>
      then choose <em>Destination → Save as PDF</em>.
    </small>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
        // Hide hint after print dialog closes
        setTimeout(function () {
          var h = document.getElementById('_pdf_hint');
          if (h) h.style.display = 'none';
        }, 1000);
      }, 600);
    });
  </script>
</body>`)

  const blob = new Blob([injected], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')

  if (!win) {
    // Popup was blocked — fall back to downloading the HTML file
    const a = document.createElement('a')
    a.href     = url
    a.download = 'navispark_report.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    // Gentle alert so the user knows what happened
    setTimeout(() => alert(
      'Pop-up was blocked.\n\nThe report was saved as an HTML file instead.\nOpen it in your browser and press Ctrl+P → "Save as PDF".'
    ), 100)
    return
  }

  // Auto-revoke the object URL after the new window has had time to load
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

// ── Shared style + layout ─────────────────────────────────────────────────────

const NOW = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function scoreColor(s) {
  if (s == null) return '#6b7280'
  return s >= 7 ? '#34d399' : s >= 5 ? '#fbbf24' : '#f87171'
}

function verdictClass(v) {
  if (v === 'READY TO SEND')   return 'v-ready'
  if (v === 'REVISE BEFORE SENDING') return 'v-revise'
  return 'v-major'
}

function chapterStatusColor(score) {
  if (score == null) return '#4b5563'
  return score >= 7 ? '#34d399' : score >= 5 ? '#fbbf24' : '#f87171'
}

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:system-ui,-apple-system,sans-serif;background:#030712;color:#f1f5f9;max-width:900px;margin:0 auto;padding:40px 24px;line-height:1.6;}
  .ns-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #1f2937;margin-bottom:30px;}
  .ns-brand{font-size:15px;font-weight:900;letter-spacing:.08em;color:#3b82f6;}
  .ns-brand span{color:#6b7280;font-weight:400;font-size:10px;display:block;letter-spacing:.1em;}
  .ns-meta{font-size:11px;color:#6b7280;text-align:right;line-height:1.8;}
  h1{font-size:22px;font-weight:700;margin-bottom:4px;}
  h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:28px 0 10px;}
  h3{font-size:14px;font-weight:600;margin-bottom:8px;}
  p{font-size:13px;color:#d1d5db;margin-bottom:8px;}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:16px;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;}
  .score-num{font-size:32px;font-weight:800;font-family:monospace;}
  .score-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;border:1px solid;font-weight:700;font-size:12px;margin-top:8px;}
  .v-ready{background:rgba(6,78,59,.4);border-color:#065f46;color:#34d399;}
  .v-revise{background:rgba(78,60,6,.4);border-color:#78350f;color:#fbbf24;}
  .v-major{background:rgba(69,10,10,.4);border-color:#7f1d1d;color:#f87171;}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px;}
  th{text-align:left;padding:8px 12px;border-bottom:1px solid #1f2937;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:.06em;}
  td{padding:8px 12px;border-bottom:1px solid #0d1117;font-size:12px;}
  .bar-track{background:#1f2937;border-radius:4px;height:8px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:4px;}
  .item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
  .num-dot{min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:rgba(248,113,113,.2);color:#f87171;flex-shrink:0;margin-top:2px;}
  .str-dot{background:rgba(52,211,153,.15);color:#34d399;}
  .chapter{border-left:3px solid;padding-left:16px;margin-bottom:24px;}
  .pull{padding:10px 14px;border-left:2px solid #374151;font-style:italic;color:#9ca3af;font-size:12px;margin:10px 0;}
  .fix-box{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:8px;padding:12px;margin-top:8px;font-size:12px;color:#93c5fd;}
  .tl-block{border:1px solid #1f2937;border-radius:12px;padding:16px;text-align:center;}
  .tl-circle{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 10px;}
  .slide-page{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px;margin-bottom:20px;min-height:220px;}
  .slide-label{font-size:9px;font-family:monospace;letter-spacing:.1em;color:#374151;text-transform:uppercase;margin-bottom:8px;}
  .delta-pos{color:#34d399;} .delta-neg{color:#f87171;} .delta-flat{color:#6b7280;}
  @media print {
    @page { margin:15mm; size:A4; }
    body  { background:#fff!important; color:#0f172a!important; padding:0; max-width:100%; }
    .ns-head { border-color:#cbd5e1!important; }
    .ns-brand { color:#2563eb!important; }
    .ns-brand span { color:#64748b!important; }
    .ns-meta  { color:#64748b!important; }
    .card, .slide-page { background:#f8fafc!important; border-color:#e2e8f0!important; break-inside:avoid; }
    h1 { color:#0f172a!important; }
    h2 { color:#475569!important; }
    h3 { color:#0f172a!important; }
    p, td, li, span { color:#374151!important; }
    th { color:#64748b!important; border-color:#cbd5e1!important; }
    td { border-color:#f1f5f9!important; }
    .bar-track { background:#e2e8f0!important; }
    .tl-block { border-color:#e2e8f0!important; }
    .score-label { color:#64748b!important; }
    /* Verdict badges — readable on white */
    .v-ready  { background:#dcfce7!important; border-color:#16a34a!important; color:#15803d!important; }
    .v-revise { background:#fef9c3!important; border-color:#ca8a04!important; color:#92400e!important; }
    .v-major  { background:#fee2e2!important; border-color:#dc2626!important; color:#991b1b!important; }
    /* Score colors — slightly darker for print contrast */
    .delta-pos { color:#15803d!important; }
    .delta-neg { color:#b91c1c!important; }
    .delta-flat{ color:#6b7280!important; }
    .chapter { border-left-color:#cbd5e1!important; }
    .pull { border-left-color:#cbd5e1!important; color:#64748b!important; }
    .fix-box { background:#eff6ff!important; border-color:#bfdbfe!important; color:#1d4ed8!important; }
    .num-dot { background:#fee2e2!important; color:#b91c1c!important; }
    .str-dot { background:#dcfce7!important; color:#15803d!important; }
    .slide-page { page-break-after:always; border-radius:0!important; }
  }
`

function htmlDoc(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="ns-head">
  <div class="ns-brand">NAVISPARK<span>PROPOSAL INTELLIGENCE</span></div>
  <div class="ns-meta">${title}<br>${NOW()}</div>
</div>
${body}
</body>
</html>`
}

// ── 1. Executive View ─────────────────────────────────────────────────────────

export function downloadExecutiveView(output, session) {
  if (!output) return
  const {
    overall_score, verdict, plain_english_summary,
    agent1_score, agent2_score, agent3_score,
    top_3_strengths = [], priority_actions,
  } = output

  const mustFix = (priority_actions?.must_fix || []).slice(0, 3)
  const scorePct = ((overall_score / 10) * 100).toFixed(0)

  const tls = [
    { label: 'Clarity & Completeness', score: agent1_score,
      desc: 'Is the proposal well-written, complete and unambiguous?' },
    { label: 'Commercial Strength', score: agent2_score,
      desc: 'Are pricing, estimates, and commercial terms sound?' },
    { label: 'Competitive Position', score: agent3_score,
      desc: 'Does the proposal stand out and address client needs?' },
  ]

  const tlHtml = tls.map(tl => {
    const c = scoreColor(tl.score)
    const icon = tl.score >= 7 ? '✓' : tl.score >= 5 ? '~' : '✕'
    return `
      <div class="tl-block">
        <div class="tl-circle" style="background:${c}22;color:${c};font-size:18px;">${icon}</div>
        <div style="font-weight:700;margin-bottom:4px;">${tl.label}</div>
        <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">${tl.desc}</div>
        <div class="badge ${verdictClass(verdict)}" style="background:${c}22;border-color:${c};color:${c};">
          ${tl.score?.toFixed(1)}/10
        </div>
      </div>`
  }).join('')

  const fixHtml = mustFix.length === 0
    ? '<p style="color:#34d399">✓ No critical issues identified.</p>'
    : mustFix.map((item, i) => `
        <div class="item">
          <div class="num-dot">${i + 1}</div>
          <div style="font-size:13px;color:#e5e7eb;">${item.action}</div>
        </div>`).join('')

  const strHtml = top_3_strengths.length === 0
    ? '<p>No strengths listed.</p>'
    : top_3_strengths.map((s, i) => {
        const icons = ['✦','✧','◈'], colors = ['#34d399','#2dd4bf','#6ee7b7']
        return `<div class="item">
          <div class="num-dot str-dot" style="background:${colors[i]}22;color:${colors[i]};">${icons[i]}</div>
          <div style="font-size:13px;color:#e5e7eb;">${s}</div>
        </div>`
      }).join('')

  const readinessText = overall_score >= 7.5 ? 'Ready — minor polish only'
    : overall_score >= 6 ? 'Almost ready — fix key issues first'
    : overall_score >= 4.5 ? 'Needs moderate revisions'
    : 'Requires significant rework'

  const body = `
    <h1>${session?.original_filename || 'Proposal Review'}</h1>
    <p style="color:#6b7280;font-size:12px;">${session?.proposal_type || ''} · ${(session?.client_industry || []).join(', ')}</p>

    <h2>Verdict</h2>
    <div class="card">
      <div style="display:flex;align-items:center;gap:20px;">
        <div>
          <div class="score-label">Overall Score</div>
          <div class="score-num" style="color:${scoreColor(overall_score)}">${overall_score?.toFixed(1)}</div>
          <div style="color:#6b7280;font-size:11px;">/10</div>
        </div>
        <div style="flex:1;">
          <span class="badge ${verdictClass(verdict)}">${verdict}</span>
          <p style="margin-top:12px;">${plain_english_summary || ''}</p>
        </div>
      </div>
      <div class="bar-track" style="margin-top:14px;">
        <div class="bar-fill" style="width:${scorePct}%;background:${scoreColor(overall_score)};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#4b5563;margin-top:4px;">
        <span>0</span><span>Do Not Send (5)</span><span>Ready (7)</span><span>10</span>
      </div>
    </div>

    <h2>Dimension Overview</h2>
    <div class="grid3">${tlHtml}</div>

    <div class="grid2" style="margin-top:20px;">
      <div>
        <h2>${mustFix.length > 0 ? `${mustFix.length} Critical Fix${mustFix.length > 1 ? 'es' : ''} Needed` : 'No Critical Issues'}</h2>
        <div class="card">${fixHtml}</div>
      </div>
      <div>
        <h2>Top Strengths</h2>
        <div class="card">${strHtml}</div>
      </div>
    </div>

    <h2>Readiness — ${readinessText}</h2>
    <div class="card">
      <div class="bar-track" style="height:16px;">
        <div class="bar-fill" style="width:${scorePct}%;background:${scoreColor(overall_score)};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#4b5563;margin-top:6px;">
        <span>0 — Major Revision</span><span>5.0</span><span>7.0 — Ready</span><span>10</span>
      </div>
    </div>
  `
  const slug = session?.id?.slice(0, 8) || 'report'
  openAsPDF(htmlDoc('Executive Summary', body))
}

// ── 2. Dashboard View ─────────────────────────────────────────────────────────

export function downloadDashboardView(output, session) {
  if (!output) return
  const {
    overall_score, verdict, agent1_score, agent2_score, agent3_score,
    priority_actions, checklist_coverage = [], section_scorecard,
    double_flagged_issues = [], cross_consistency_issues = [],
    weight_adjusted, weight_label, weight_reason,
  } = output

  const kpiRows = [
    { label: 'Overall Score',           score: overall_score, note: verdict },
    { label: 'Completeness & Clarity',  score: agent1_score,  note: 'Agent 1' },
    { label: 'Commercial Integrity',    score: agent2_score,  note: 'Agent 2' },
    { label: 'Competitive Strength',    score: agent3_score,  note: 'Agent 3' },
  ].map(r => `<tr>
    <td>${r.label}</td>
    <td style="font-family:monospace;font-weight:700;color:${scoreColor(r.score)}">${r.score?.toFixed(1)}</td>
    <td>${r.note}</td>
    <td><div class="bar-track"><div class="bar-fill" style="width:${((r.score/10)*100).toFixed(0)}%;background:${scoreColor(r.score)};"></div></div></td>
  </tr>`).join('')

  const tiers = [
    { key: 'must_fix',   label: 'Must Fix' },
    { key: 'should_fix', label: 'Should Fix' },
    { key: 'next_time',  label: 'Next Time' },
  ]
  const actionRows = tiers.flatMap(t =>
    (priority_actions?.[t.key] || []).map((item, i) => `<tr>
      <td>${t.label}</td>
      <td>${item.action}</td>
      <td style="font-size:11px;color:#9ca3af;">${(item.source_agents || []).join(', ')}</td>
    </tr>`)
  ).join('')

  const sheets = ['Proposal', 'Estimation', 'Pricing']
  const bySheet = {}
  sheets.forEach(s => { bySheet[s] = { covered: 0, partial: 0, missing: 0, total: 0 } })
  checklist_coverage.forEach(item => {
    if (bySheet[item.sheet]) {
      bySheet[item.sheet].total++
      if (item.status === 'COVERED') bySheet[item.sheet].covered++
      else if (item.status === 'PARTIAL') bySheet[item.sheet].partial++
      else bySheet[item.sheet].missing++
    }
  })
  const clRows = sheets.map(s => {
    const d = bySheet[s]
    if (!d.total) return ''
    const pct = ((d.covered / d.total) * 100).toFixed(0)
    return `<tr>
      <td>${s}</td>
      <td style="color:#34d399">${d.covered}</td>
      <td style="color:#fbbf24">${d.partial}</td>
      <td style="color:#f87171">${d.missing}</td>
      <td>${d.total}</td>
      <td><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#34d399;"></div></div></td>
    </tr>`
  }).join('')

  const dimRows = section_scorecard
    ? Object.entries(section_scorecard).map(([key, val]) => `<tr>
        <td style="text-transform:capitalize;">${key.replace(/_/g,' ')}</td>
        <td style="font-family:monospace;font-weight:700;color:${scoreColor(val)}">${val?.toFixed(1)}</td>
        <td><div class="bar-track"><div class="bar-fill" style="width:${((val/10)*100).toFixed(0)}%;background:${scoreColor(val)};"></div></div></td>
      </tr>`).join('')
    : ''

  const body = `
    <h1>${session?.original_filename || 'Proposal Dashboard'}</h1>
    ${weight_adjusted ? `<p style="color:#fbbf24;font-size:12px;">⚡ ${weight_label} weighting applied. ${weight_reason}</p>` : ''}

    <h2>Score Summary</h2>
    <div class="card">
      <table><thead><tr><th>Dimension</th><th>Score</th><th>Source</th><th style="width:200px;">Bar</th></tr></thead>
      <tbody>${kpiRows}</tbody></table>
    </div>

    ${section_scorecard ? `<h2>Dimension Breakdown (All 11 Sub-scores)</h2>
    <div class="card"><table><thead><tr><th>Dimension</th><th>Score</th><th style="width:200px;">Bar</th></tr></thead>
    <tbody>${dimRows}</tbody></table></div>` : ''}

    <h2>Checklist Coverage</h2>
    <div class="card">
      <table><thead><tr><th>Sheet</th><th>Covered</th><th>Partial</th><th>Missing</th><th>Total</th><th style="width:200px;">Progress</th></tr></thead>
      <tbody>${clRows}</tbody></table>
    </div>

    <h2>Priority Action Plan</h2>
    <div class="card">
      <table><thead><tr><th>Priority</th><th>Action Required</th><th>Source Agents</th></tr></thead>
      <tbody>${actionRows || '<tr><td colspan="3" style="color:#6b7280;">No action items found.</td></tr>'}</tbody></table>
    </div>

    ${double_flagged_issues.length > 0 ? `<h2>Double-Flagged Issues (${double_flagged_issues.length})</h2>
    <div class="card">
      ${double_flagged_issues.map(i => `<div class="item" style="margin-bottom:12px;">
        <div class="num-dot">!</div>
        <div><div style="font-size:13px;color:#e5e7eb;">${i.issue_summary}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${(i.agents||[]).join(' · ')}</div></div>
      </div>`).join('')}
    </div>` : ''}
  `
  const slug = session?.id?.slice(0, 8) || 'report'
  openAsPDF(htmlDoc('Analyst Dashboard', body))
}

// ── 3. In-Depth View ──────────────────────────────────────────────────────────

export function downloadInDepthView(output, session) {
  if (!output) return

  const a4 = output
  const lines = [`# In-Depth Analysis Report\n`,
    `**Proposal:** ${session?.original_filename || '—'}`,
    `**Type:** ${session?.proposal_type || '—'}`,
    `**Industries:** ${(session?.client_industry || []).join(', ')}`,
    `**Generated:** ${NOW()}`,
    '\n---\n',
    `## Final Verdict: ${a4.verdict}`,
    `**Overall Score:** ${a4.overall_score?.toFixed(1)}/10`,
    a4.plain_english_summary ? `\n> ${a4.plain_english_summary}\n` : '',
    `### Sub-Scores`,
    `| Dimension | Score |`,
    `|---|---|`,
    `| Completeness & Clarity (A1) | ${a4.agent1_score?.toFixed(1)} |`,
    `| Commercial Integrity (A2) | ${a4.agent2_score?.toFixed(1)} |`,
    `| Competitive Strength (A3) | ${a4.agent3_score?.toFixed(1)} |`,
    a4.weight_adjusted ? `\n> ⚡ ${a4.weight_label} weighting applied. ${a4.weight_reason}\n` : '',
    '\n---\n',
    `## Priority Actions\n`,
    ...(['must_fix','should_fix','next_time'].flatMap(tier => {
      const items = a4.priority_actions?.[tier] || []
      if (!items.length) return []
      const labels = { must_fix: '🔴 Must Fix', should_fix: '🟡 Should Fix', next_time: '🔵 Next Time' }
      return [`### ${labels[tier]}\n`, ...items.map((item, i) =>
        `${i+1}. **${item.action}**${item.why ? `\n   - *Why:* ${item.why}` : ''}`)]
    })),
    '\n---\n',
    `## Double-Flagged Issues\n`,
    ...(a4.double_flagged_issues?.length
      ? a4.double_flagged_issues.map((i, idx) => `${idx+1}. **${i.issue_summary}** _(${(i.agents||[]).join(', ')})_`)
      : ['✅ None identified.']),
    '\n---\n',
    `## Cross-Consistency Issues\n`,
    ...(a4.cross_consistency_issues?.length
      ? a4.cross_consistency_issues.map(i => `- **${i.severity}** — ${i.finding}`)
      : ['✅ All checks passed.']),
    '\n---\n',
    `## Section Scorecard\n`,
    `| Dimension | Score |`,
    `|---|---|`,
    ...(a4.section_scorecard ? Object.entries(a4.section_scorecard).map(([k,v]) =>
      `| ${k.replace(/_/g,' ')} | ${v?.toFixed(1)} |`) : []),
    '\n---\n',
    `## Checklist Coverage\n`,
    `| ID | Topic | Sheet | Status | Agent |`,
    `|---|---|---|---|---|`,
    ...(a4.checklist_coverage?.map(c =>
      `| ${c.id} | ${c.topic} | ${c.sheet} | ${c.status} | ${c.primary_agent} |`) || []),
    '\n---\n',
    `## Top Strengths\n`,
    ...(a4.top_3_strengths?.map((s,i) => `${i+1}. ${s}`) || []),
    '\n---\n',
    `## Rewrite Suggestions\n`,
    ...(a4.rewrite_suggestions?.flatMap(r => [
      `### ${r.section || 'Section'}`,
      `**Original:** ${r.original}`,
      `**Improved:** ${r.improved}`,
      r.what_changed ? `*${r.what_changed}*` : '',
      '',
    ]) || ['None.']),
  ]

  const slug = session?.id?.slice(0, 8) || 'report'
  triggerDownload(lines.filter(l => l !== '').join('\n'), `indepth_${slug}.md`, 'text/markdown')
}

// ── 4. Storyboard View ────────────────────────────────────────────────────────

export function downloadStoryboardView(output, session) {
  if (!output) return
  const { overall_score, verdict, agent1_score, agent2_score, agent3_score, priority_actions, top_3_strengths = [] } = output
  const mustFix = priority_actions?.must_fix || []

  const chapters = [
    {
      num: 1, title: 'Clarity & Completeness', score: agent1_score, agent: 'Agent 1',
      body: `Agent 1 reviewed the proposal for completeness and clarity, giving it ${agent1_score?.toFixed(1)}/10.
The proposal was assessed against the full GSK evaluation checklist — checking writing quality, scope definition, and whether all required sections are present and clearly articulated.`,
    },
    {
      num: 2, title: 'Commercial Integrity', score: agent2_score, agent: 'Agent 2',
      body: `Agent 2 examined the commercial and estimation structure, scoring ${agent2_score?.toFixed(1)}/10.
The review covered pricing completeness, phase coverage, estimation methodology, and arithmetic accuracy across the cost model.`,
    },
    {
      num: 3, title: 'Competitive Strength', score: agent3_score, agent: 'Agent 3',
      body: `Agent 3 evaluated how well the proposal positions this team against competitors, scoring ${agent3_score?.toFixed(1)}/10.
The analysis focused on differentiation, alignment with client priorities, narrative flow, credibility, and risk transparency.`,
    },
    {
      num: 4, title: 'The Overall Verdict', score: overall_score, agent: 'Agent 4 — Chief Proposal Review Officer',
      body: `After synthesising all three specialist reports, Agent 4 assigned an overall score of ${overall_score?.toFixed(1)}/10 and a verdict of ${verdict}.
${top_3_strengths.length > 0 ? `The proposal's genuine strengths include: ${top_3_strengths.slice(0,2).join('; ')}.` : ''}
${mustFix.length > 0 ? `${mustFix.length} issue${mustFix.length>1?'s':''} must be addressed before submission.` : 'No critical issues were identified.'}`,
    },
  ]

  const riskText = verdict === 'READY TO SEND'
    ? 'This proposal is strong enough to submit. Minor polish will improve the score further but should not delay submission.'
    : verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
    ? 'Submitting in the current state carries a high risk of rejection. A thorough revision is strongly recommended.'
    : `Addressing the ${mustFix.length} critical issue${mustFix.length>1?'s':''} before submission is strongly recommended.`

  const chapHtml = chapters.map(ch => {
    const c = chapterStatusColor(ch.score)
    return `<div class="chapter" style="border-color:${c};">
      <div class="score-label">Chapter ${ch.num} · ${ch.agent}</div>
      <h3 style="color:${c};margin-bottom:6px;">${ch.title}
        <span style="font-family:monospace;font-size:13px;margin-left:10px;">${ch.score?.toFixed(1)}/10</span>
      </h3>
      <p>${ch.body.replace(/\n/g,'<br>')}</p>
    </div>`
  }).join('')

  const minViableFixes = mustFix.slice(0, 3).map((f, i) =>
    `<div class="item"><div class="num-dot">${i+1}</div><div style="font-size:13px;">${f.action}</div></div>`
  ).join('')

  const verdCls = verdictClass(verdict)
  const body = `
    <h1>${session?.original_filename || 'Proposal Review'}</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">
      Estimated reading time: ~3 min · ${session?.proposal_type || ''} · ${(session?.client_industry||[]).join(', ')}
    </p>
    ${chapHtml}
    <h2>What happens if you submit as-is?</h2>
    <div class="card" style="border-left:3px solid ${scoreColor(overall_score)};">
      <span class="badge ${verdCls}">${verdict}</span>
      <p style="margin-top:12px;">${riskText}</p>
      ${mustFix.length > 0 ? `<div style="margin-top:14px;"><div class="score-label">Minimum Viable Fixes</div>${minViableFixes}</div>` : ''}
    </div>
  `
  const slug = session?.id?.slice(0, 8) || 'report'
  openAsPDF(htmlDoc('Analysis Storyboard', body))
}

// ── 5. Action Plan View ───────────────────────────────────────────────────────

export function downloadActionPlanView(output, session) {
  if (!output?.priority_actions) return
  const tiers = [
    { key: 'must_fix',   label: 'Must Fix'   },
    { key: 'should_fix', label: 'Should Fix' },
    { key: 'next_time',  label: 'Next Time'  },
    { key: 'internal',   label: 'Internal'   },
  ]
  const headers = ['Priority', 'Action', 'Why', 'Source Agents']
  const rows = tiers.flatMap(t =>
    (output.priority_actions[t.key] || []).map(item => [
      t.label,
      `"${(item.action||'').replace(/"/g,'""')}"`,
      `"${(item.why||'').replace(/"/g,'""')}"`,
      (item.source_agents||[]).join('; '),
    ])
  )
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const slug = session?.id?.slice(0, 8) || 'report'
  triggerDownload(csv, `action_plan_${slug}.csv`, 'text/csv')
}

// ── 6. Presentation View ──────────────────────────────────────────────────────

export function downloadPresentationView(output, session) {
  if (!output) return
  const { overall_score, verdict, plain_english_summary, top_3_strengths = [], priority_actions, agent1_score, agent2_score, agent3_score } = output
  const mustFix = (priority_actions?.must_fix || []).slice(0, 4)
  const shouldFix = (priority_actions?.should_fix || []).slice(0, 4)

  const scoreBarHtml = (label, score, color) => `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>${label}</span>
        <span style="font-family:monospace;font-weight:700;color:${color}">${score?.toFixed(1)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${((score/10)*100).toFixed(0)}%;background:${color};"></div></div>
    </div>`

  const slidesHtml = [
    // Cover
    `<div class="slide-page">
      <div class="slide-label">Slide 1 · Cover</div>
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:28px;font-weight:700;margin-bottom:8px;">${session?.original_filename || 'Proposal Review'}</div>
        <div style="color:#6b7280;margin-bottom:12px;">${session?.proposal_type || ''} · ${(session?.client_industry||[]).join(', ')}</div>
        <span class="badge ${verdictClass(verdict)}">${verdict}</span>
        <div style="margin-top:16px;color:#4b5563;font-size:11px;">NaviSpark Proposal Intelligence · ${NOW()}</div>
      </div>
    </div>`,

    // Scores
    `<div class="slide-page">
      <div class="slide-label">Slide 2 · Score Overview</div>
      <div style="text-align:center;margin-bottom:20px;">
        <div class="score-label">Overall Score</div>
        <div class="score-num" style="color:${scoreColor(overall_score)}">${overall_score?.toFixed(1)}</div>
        <div style="color:#6b7280;font-size:12px;">/10 · <span class="badge ${verdictClass(verdict)}" style="font-size:11px;">${verdict}</span></div>
      </div>
      <div class="grid3">
        ${[['Completeness',agent1_score,'#818cf8'],['Commercial',agent2_score,'#a78bfa'],['Competitive',agent3_score,'#34d399']].map(([l,s,c]) => `
          <div style="text-align:center;">
            <div style="color:${c};font-family:monospace;font-size:22px;font-weight:700;">${s?.toFixed(1)}</div>
            <div style="font-size:11px;color:#6b7280;">${l}</div>
          </div>`).join('')}
      </div>
    </div>`,

    // Verdict
    `<div class="slide-page">
      <div class="slide-label">Slide 3 · Verdict</div>
      <span class="badge ${verdictClass(verdict)}" style="font-size:18px;font-weight:900;padding:12px 24px;">${verdict}</span>
      <p style="margin-top:16px;font-size:16px;">${plain_english_summary || ''}</p>
    </div>`,

    // Strengths
    top_3_strengths.length > 0 ? `<div class="slide-page">
      <div class="slide-label">Slide 4 · Strengths</div>
      <h3 style="font-size:20px;margin-bottom:16px;">What's Working</h3>
      ${top_3_strengths.map((s,i) => `<div class="item" style="margin-bottom:14px;">
        <div class="num-dot str-dot">${['✦','✧','◈'][i]}</div>
        <div style="font-size:14px;">${s}</div>
      </div>`).join('')}
    </div>` : '',

    // Critical issues
    mustFix.length > 0 ? `<div class="slide-page">
      <div class="slide-label">Slide 5 · Critical Issues</div>
      <h3 style="font-size:20px;margin-bottom:16px;">What Needs Fixing</h3>
      ${mustFix.map((item,i) => `<div class="item" style="margin-bottom:12px;">
        <div class="num-dot">${i+1}</div>
        <div style="font-size:13px;">${item.action}</div>
      </div>`).join('')}
    </div>` : '',

    // Score breakdown
    `<div class="slide-page">
      <div class="slide-label">Slide · Score Breakdown</div>
      <h3 style="font-size:20px;margin-bottom:16px;">How the Score was Calculated</h3>
      ${scoreBarHtml('Completeness & Clarity', agent1_score, '#818cf8')}
      ${scoreBarHtml('Commercial Integrity', agent2_score, '#a78bfa')}
      ${scoreBarHtml('Competitive Strength', agent3_score, '#34d399')}
      ${scoreBarHtml('Overall Score', overall_score, scoreColor(overall_score))}
    </div>`,

    // Recommendation
    `<div class="slide-page">
      <div class="slide-label">Slide · Recommendation</div>
      <span class="badge ${verdictClass(verdict)}" style="font-size:16px;padding:10px 20px;">${verdict}</span>
      <p style="font-size:16px;margin-top:16px;">${mustFix.length === 0 ? 'Submit this proposal with confidence.' : `Address ${mustFix.length} critical issue${mustFix.length>1?'s':''} before submission.`}</p>
      ${mustFix.slice(0,3).map((f,i) => `<div class="item" style="margin-top:10px;">
        <div class="num-dot">${i+1}</div><div style="font-size:13px;">${f.action}</div>
      </div>`).join('')}
    </div>`,
  ].filter(Boolean).join('\n')

  const body = `
    <h1 style="margin-bottom:4px;">Presentation Slides</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">${session?.original_filename || ''} · Print each section as a slide</p>
    ${slidesHtml}
  `
  const slug = session?.id?.slice(0, 8) || 'report'
  openAsPDF(htmlDoc('Presentation Slides', body))
}

// ── 7. Comparison View ────────────────────────────────────────────────────────

export function downloadComparisonView(currentSession, prevSession) {
  if (!currentSession?.agent4_output || !prevSession?.agent4_output) return
  const curr = currentSession.agent4_output
  const prev = prevSession.agent4_output
  const cVer = currentSession.version_number || '?'
  const pVer = prevSession.version_number || '?'

  const deltaHtml = (label, prevS, currS) => {
    const d = currS - prevS
    const dStr = (d > 0 ? '+' : '') + d.toFixed(1)
    const cls = d > 0 ? 'delta-pos' : d < 0 ? 'delta-neg' : 'delta-flat'
    return `<tr>
      <td>${label}</td>
      <td style="font-family:monospace;color:${scoreColor(prevS)}">${prevS?.toFixed(1)}</td>
      <td style="font-family:monospace;color:${scoreColor(currS)}">${currS?.toFixed(1)}</td>
      <td style="font-family:monospace;font-weight:700;" class="${cls}">${dStr}</td>
    </tr>`
  }

  const prevMust = prev.priority_actions?.must_fix?.length || 0
  const currMust = curr.priority_actions?.must_fix?.length || 0

  // Checklist delta
  const prevList = prev.checklist_coverage || []
  const currList = curr.checklist_coverage || []
  const improved = currList.filter(c => {
    const p = prevList.find(x => x.id === c.id)
    return p && p.status !== 'COVERED' && c.status === 'COVERED'
  })
  const stillMissing = currList.filter(c => c.status === 'MISSING')

  const body = `
    <h1>Comparison Report: V${pVer} → V${cVer}</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">${currentSession.original_filename || ''} · ${NOW()}</p>

    <h2>Verdict Progression</h2>
    <div class="card" style="display:flex;align-items:center;gap:20px;">
      <div><div class="score-label">V${pVer}</div><span class="badge ${verdictClass(prev.verdict)}">${prev.verdict}</span></div>
      <div style="color:#4b5563;font-size:24px;">→</div>
      <div><div class="score-label">V${cVer}</div><span class="badge ${verdictClass(curr.verdict)}">${curr.verdict}</span></div>
    </div>

    <h2>Score Delta — V${pVer} to V${cVer}</h2>
    <div class="card">
      <table>
        <thead><tr><th>Dimension</th><th>V${pVer}</th><th>V${cVer}</th><th>Change</th></tr></thead>
        <tbody>
          ${deltaHtml('Overall Score', prev.overall_score, curr.overall_score)}
          ${deltaHtml('Completeness & Clarity', prev.agent1_score, curr.agent1_score)}
          ${deltaHtml('Commercial Integrity', prev.agent2_score, curr.agent2_score)}
          ${deltaHtml('Competitive Strength', prev.agent3_score, curr.agent3_score)}
        </tbody>
      </table>
    </div>

    <h2>Priority Actions Progress</h2>
    <div class="card">
      <table>
        <thead><tr><th>Type</th><th>V${pVer}</th><th>V${cVer}</th><th>Change</th></tr></thead>
        <tbody>
          ${[['Must Fix', prevMust, currMust],['Should Fix',prev.priority_actions?.should_fix?.length||0,curr.priority_actions?.should_fix?.length||0]].map(([l,p,c]) => {
            const d = c - p
            const cls = d <= 0 ? 'delta-pos' : 'delta-neg'
            return `<tr><td>${l}</td><td>${p}</td><td>${c}</td><td class="${cls}">${d > 0 ? '+' : ''}${d} ${d <= 0 ? '✓' : '⚠'}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    </div>

    ${improved.length > 0 ? `<h2>Newly Covered Checklist Items (${improved.length})</h2>
    <div class="card">
      ${improved.map(i => `<div style="margin-bottom:6px;font-size:12px;color:#34d399;">✓ <strong>${i.id}</strong> — ${i.topic}</div>`).join('')}
    </div>` : ''}

    ${stillMissing.length > 0 ? `<h2>Still Missing (${stillMissing.length})</h2>
    <div class="card">
      ${stillMissing.slice(0,10).map(i => `<div style="margin-bottom:6px;font-size:12px;color:#f87171;">✕ <strong>${i.id}</strong> — ${i.topic}</div>`).join('')}
      ${stillMissing.length > 10 ? `<p style="color:#4b5563;">+ ${stillMissing.length-10} more</p>` : ''}
    </div>` : ''}

    ${curr.double_flagged_issues?.length != null ? `<h2>Double-Flagged Issues</h2>
    <div class="card">
      <p style="color:#6b7280;font-size:12px;">V${pVer}: ${prev.double_flagged_issues?.length||0} issues &nbsp;→&nbsp; V${cVer}: ${curr.double_flagged_issues?.length||0} issues</p>
    </div>` : ''}
  `
  openAsPDF(htmlDoc(`Comparison V${pVer} vs V${cVer}`, body))
}

// ── 8. Comparison Dashboard (all versions) ────────────────────────────────────

export function downloadComparisonDashboard(versions) {
  const completed = versions.filter(v => v.status === 'complete' && v.agent4_output)
  if (completed.length < 2) return

  const first = completed[0], latest = completed[completed.length - 1]
  const scoreRowsHtml = completed.map(v => {
    const o = v.agent4_output
    return `<tr>
      <td>V${v.version_number}</td>
      <td style="font-family:monospace;color:${scoreColor(o.overall_score)}">${o.overall_score?.toFixed(1)}</td>
      <td style="font-family:monospace;color:${scoreColor(o.agent1_score)}">${o.agent1_score?.toFixed(1)}</td>
      <td style="font-family:monospace;color:${scoreColor(o.agent2_score)}">${o.agent2_score?.toFixed(1)}</td>
      <td style="font-family:monospace;color:${scoreColor(o.agent3_score)}">${o.agent3_score?.toFixed(1)}</td>
      <td><span class="badge ${verdictClass(o.verdict)}" style="font-size:10px;padding:2px 8px;">${o.verdict}</span></td>
      <td>${o.priority_actions?.must_fix?.length || 0}</td>
    </tr>`
  }).join('')

  const body = `
    <h1>Comparison Dashboard</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">
      ${completed.length} versions · V${first.version_number} to V${latest.version_number} · ${NOW()}
    </p>

    <h2>Score Progression</h2>
    <div class="card">
      <table>
        <thead><tr><th>Version</th><th>Overall</th><th>Completeness</th><th>Commercial</th><th>Competitive</th><th>Verdict</th><th>Must Fix</th></tr></thead>
        <tbody>${scoreRowsHtml}</tbody>
      </table>
    </div>

    <h2>Overall Score Delta — V${first.version_number} to V${latest.version_number}</h2>
    <div class="card grid4">
      ${[['Overall',first.agent4_output.overall_score,latest.agent4_output.overall_score],
         ['Completeness',first.agent4_output.agent1_score,latest.agent4_output.agent1_score],
         ['Commercial',first.agent4_output.agent2_score,latest.agent4_output.agent2_score],
         ['Competitive',first.agent4_output.agent3_score,latest.agent4_output.agent3_score],
      ].map(([l,f,la]) => {
        const d = la - f, cls = d >= 0 ? 'delta-pos' : 'delta-neg'
        return `<div style="text-align:center;">
          <div class="score-label">${l}</div>
          <div class="score-num" style="color:${scoreColor(la)}">${la?.toFixed(1)}</div>
          <div class="${cls}" style="font-family:monospace;font-weight:700;">${d>0?'+':''}${d.toFixed(1)}</div>
        </div>`
      }).join('')}
    </div>
  `
  openAsPDF(htmlDoc('Comparison Dashboard', body))
}

// ── Master dispatcher ─────────────────────────────────────────────────────────

export function downloadCurrentView({ activeView, sidebarMode, output, session, history, prevSession }) {
  if (sidebarMode === 'compare_all') {
    downloadComparisonDashboard(history)
    return
  }
  switch (activeView) {
    case 'executive':    return downloadExecutiveView(output, session)
    case 'dashboard':    return downloadDashboardView(output, session)
    case 'indepth':      return downloadInDepthView(output, session)
    case 'storyboard':   return downloadStoryboardView(output, session)
    case 'actionplan':   return downloadActionPlanView(output, session)
    case 'presentation': return downloadPresentationView(output, session)
    case 'comparison':   return downloadComparisonView(
      { ...session, agent4_output: output },
      prevSession
    )
    default: return downloadExecutiveView(output, session)
  }
}

// View metadata for button labels
export const VIEW_DOWNLOAD_META = {
  executive:    { label: 'Executive Report',    ext: 'PDF' },
  dashboard:    { label: 'Dashboard Report',    ext: 'PDF' },
  indepth:      { label: 'Full Analysis',       ext: 'MD'  },
  storyboard:   { label: 'Storyboard',          ext: 'PDF' },
  actionplan:   { label: 'Action Plan',         ext: 'CSV' },
  presentation: { label: 'Slide Deck',          ext: 'PDF' },
  comparison:   { label: 'Comparison Report',   ext: 'PDF' },
  compare_all:  { label: 'All Versions Report', ext: 'PDF' },
}
