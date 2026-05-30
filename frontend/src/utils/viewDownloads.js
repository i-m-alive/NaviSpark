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

function downloadAsHTML(htmlContent, filename) {
  triggerDownload(htmlContent, filename, 'text/html')
}

function downloadAsJSON(data, filename) {
  triggerDownload(JSON.stringify(data, null, 2), filename, 'application/json')
}

/**
 * Opens the HTML report in a new tab and immediately triggers the browser's
 * Print dialog. The user selects "Save as PDF".
 * Popup-blocked fallback: downloads the HTML file directly.
 */
function openAsPDF(htmlContent, fallbackFilename = 'navispark_report') {
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
    const a = document.createElement('a')
    a.href     = url
    a.download = `${fallbackFilename}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setTimeout(() => alert(
      'Pop-up was blocked.\n\nThe report was saved as an HTML file instead.\nOpen it in your browser and press Ctrl+P → "Save as PDF".'
    ), 100)
    return
  }

  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const NOW = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function scoreColor(s) {
  if (s == null) return '#6b7280'
  return s >= 7 ? '#34d399' : s >= 5 ? '#fbbf24' : '#f87171'
}

function verdictClass(v) {
  if (v === 'READY TO SEND')        return 'v-ready'
  if (v === 'REVISE BEFORE SENDING') return 'v-revise'
  return 'v-major'
}

function chapterStatusColor(score) {
  if (score == null) return '#4b5563'
  return score >= 7 ? '#34d399' : score >= 5 ? '#fbbf24' : '#f87171'
}

// ── Inline SVG chart generators ───────────────────────────────────────────────

/** Score ring: animated stroke circle with score label. */
function svgScoreRing(score, size = 130) {
  const r      = size * 0.36
  const circ   = 2 * Math.PI * r
  const pct    = score != null ? Math.min(100, (score / 10) * 100) : 0
  const color  = scoreColor(score)
  const cx     = size / 2
  const offset = circ * (1 - pct / 100)
  const sw     = (size * 0.12).toFixed(1)
  const textSz = (size * 0.22).toFixed(0)
  const subSz  = (size * 0.10).toFixed(0)
  return `<svg class="svg-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;">
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#1f2937" stroke-width="${sw}" class="svg-ring-bg"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
    stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
    transform="rotate(-90 ${cx} ${cx})"/>
  <text x="${cx}" y="${(cx - size * 0.04).toFixed(0)}" text-anchor="middle" dominant-baseline="central"
    fill="${color}" font-size="${textSz}" font-family="monospace,ui-monospace,Courier New" font-weight="700">${score != null ? score.toFixed(1) : '—'}</text>
  <text x="${cx}" y="${(cx + size * 0.19).toFixed(0)}" text-anchor="middle"
    fill="#6b7280" font-size="${subSz}" font-family="system-ui,sans-serif" class="svg-label">/10</text>
</svg>`
}

/**
 * Radar / spider chart.
 * scores: [{label, value}] — value 0–10
 */
function svgRadar(scores, size = 260) {
  const n = scores.length
  if (n < 3) return ''
  const cx = size / 2, cy = size / 2 + 6
  const maxR = size * 0.32
  const step = (2 * Math.PI) / n

  const pt = (i, r) => ({
    x: cx + r * Math.sin(i * step),
    y: cy - r * Math.cos(i * step),
  })

  const gridRings = [0.25, 0.5, 0.75, 1.0].map(f => {
    const pts = scores.map((_, i) => { const p = pt(i, maxR * f); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="#1f2937" stroke-width="0.8" class="svg-grid"/>`
  }).join('')

  const axes = scores.map((_, i) => {
    const p = pt(i, maxR)
    return `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#1f2937" stroke-width="0.8" class="svg-grid"/>`
  }).join('')

  const dataPts = scores.map((s, i) => {
    const r = maxR * Math.max(0.04, (s.value || 0) / 10)
    const p = pt(i, r)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  const labels = scores.map((s, i) => {
    const p = pt(i, maxR + 24)
    const anchor = p.x < cx - 6 ? 'end' : p.x > cx + 6 ? 'start' : 'middle'
    // Truncate long labels
    const lbl = s.label.length > 12 ? s.label.slice(0, 11) + '…' : s.label
    return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="central" fill="#9ca3af" font-size="8.5" font-family="system-ui,sans-serif" class="svg-label">${lbl}</text>`
  }).join('')

  const dots = scores.map((s, i) => {
    const r = maxR * Math.max(0.04, (s.value || 0) / 10)
    const p = pt(i, r)
    const c = scoreColor(s.value)
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${c}" stroke="#0a0f1a" stroke-width="1"/>`
  }).join('')

  const scoreLabels = scores.map((s, i) => {
    const r = maxR * Math.max(0.04, (s.value || 0) / 10)
    const p = pt(i, r - 12)
    const c = scoreColor(s.value)
    if (r < 14) return ''
    return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${c}" font-size="7.5" font-family="monospace" font-weight="700">${s.value?.toFixed(1)}</text>`
  }).join('')

  return `<svg class="svg-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="overflow:visible;display:block;">
  ${gridRings}${axes}
  <polygon points="${dataPts}" fill="rgba(99,102,241,0.18)" stroke="#6366f1" stroke-width="1.5"/>
  ${dots}${labels}${scoreLabels}
</svg>`
}

/**
 * Multi-line trend chart for version comparison.
 * versions: [{version_number, agent4_output: {overall_score, agent1_score, ...}}]
 */
function svgLineChart(versions, width = 460, height = 170) {
  if (!versions || versions.length < 2) return ''
  const n = versions.length
  const padL = 30, padR = 82, padT = 14, padB = 28
  const W = width - padL - padR, H = height - padT - padB

  const series = [
    { key: 'overall_score', color: '#6366f1', label: 'Overall' },
    { key: 'agent1_score',  color: '#818cf8', label: 'Clarity' },
    { key: 'agent2_score',  color: '#c084fc', label: 'Commercial' },
    { key: 'agent3_score',  color: '#34d399', label: 'Competitive' },
  ]

  const xOf = i => padL + (n === 1 ? W / 2 : (i / (n - 1)) * W)
  const yOf = v => padT + H * (1 - v / 10)

  const gridLines = [0, 2.5, 5, 7.5, 10].map(v => {
    const y = yOf(v).toFixed(1)
    return `<line x1="${padL}" y1="${y}" x2="${padL + W}" y2="${y}" stroke="#1f2937" stroke-width="0.6" stroke-dasharray="4,3" class="svg-grid"/>` +
           `<text x="${(padL - 4).toFixed(1)}" y="${y}" text-anchor="end" dominant-baseline="central" fill="#4b5563" font-size="8" font-family="monospace" class="svg-label">${v}</text>`
  }).join('')

  const xLabels = versions.map((v, i) => {
    const x = xOf(i).toFixed(1)
    return `<text x="${x}" y="${(padT + H + 14).toFixed(1)}" text-anchor="middle" fill="#4b5563" font-size="8" font-family="monospace" class="svg-label">V${v.version_number}</text>`
  }).join('')

  const seriesLines = series.map(s => {
    const pts = versions.map((v, i) => {
      const val = v.agent4_output?.[s.key]
      if (val == null) return null
      return `${xOf(i).toFixed(1)},${yOf(val).toFixed(1)}`
    }).filter(Boolean)
    if (pts.length < 2) return ''
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
  }).join('')

  const seriesDots = series.flatMap(s =>
    versions.map((v, i) => {
      const val = v.agent4_output?.[s.key]
      if (val == null) return ''
      return `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(val).toFixed(1)}" r="3.5" fill="${s.color}" stroke="#0a0f1a" stroke-width="1.5"/>`
    })
  ).join('')

  const legend = series.map((s, i) => {
    const lx = padL + W + 10
    const ly = padT + i * 17
    return `<rect x="${lx}" y="${(ly - 2).toFixed(1)}" width="10" height="3" fill="${s.color}" rx="1.5"/>` +
           `<text x="${(lx + 14).toFixed(1)}" y="${(ly + 0.5).toFixed(1)}" dominant-baseline="central" fill="#6b7280" font-size="8" font-family="system-ui">${s.label}</text>`
  }).join('')

  return `<svg class="svg-chart" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;">
  ${gridLines}${xLabels}${seriesLines}${seriesDots}${legend}
</svg>`
}

/**
 * Horizontal bar chart.
 * items: [{label, value, color?}] — value 0–10
 */
function svgHBars(items, width = 390) {
  if (!items.length) return ''
  const padL = 130, padR = 55, barH = 18, gap = 8
  const W = width - padL - padR
  const totalH = items.length * (barH + gap) + 6

  const bars = items.map((item, i) => {
    const y = 4 + i * (barH + gap)
    const bw = Math.max(2, ((item.value || 0) / 10) * W)
    const c = item.color || scoreColor(item.value)
    return `
      <text x="${(padL - 7).toFixed(1)}" y="${(y + barH / 2).toFixed(1)}" text-anchor="end" dominant-baseline="central" fill="#9ca3af" font-size="10" font-family="system-ui,sans-serif" class="svg-label">${item.label}</text>
      <rect x="${padL}" y="${y}" width="${W}" height="${barH}" fill="#1f2937" rx="4" class="svg-bg"/>
      <rect x="${padL}" y="${y}" width="${bw.toFixed(1)}" height="${barH}" fill="${c}" rx="4"/>
      <text x="${(padL + bw + 6).toFixed(1)}" y="${(y + barH / 2).toFixed(1)}" dominant-baseline="central" fill="${c}" font-size="10" font-family="monospace,ui-monospace" font-weight="700">${item.value != null ? item.value.toFixed(1) : '—'}</text>
    `
  }).join('')

  return `<svg class="svg-chart" viewBox="0 0 ${width} ${totalH}" width="${width}" height="${totalH}" style="display:block;">${bars}</svg>`
}

/**
 * Stacked bar chart for checklist coverage per version.
 * items: [{label, covered, partial, missing, total}]
 */
function svgStackedBars(items, width = 460, height = 130) {
  if (!items.length) return ''
  const n = items.length
  const padL = 28, padR = 16, padT = 12, padB = 36
  const W = width - padL - padR, H = height - padT - padB
  const barW = Math.min(50, W / n - 10)
  const legendH = 20

  const bars = items.map((item, i) => {
    const total = item.total || 1
    let yOff = padT + H
    const segs = []
    const addSeg = (count, color) => {
      if (!count) return
      const h = (count / total) * H
      yOff -= h
      segs.push(`<rect x="${(padL + (i + 0.5) * (W / n) - barW / 2).toFixed(1)}" y="${yOff.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${color}"/>`)
    }
    addSeg(item.missing, '#f87171')
    addSeg(item.partial,  '#fbbf24')
    addSeg(item.covered,  '#34d399')
    const x = (padL + (i + 0.5) * (W / n)).toFixed(1)
    return segs.join('') +
      `<text x="${x}" y="${(padT + H + 13).toFixed(1)}" text-anchor="middle" fill="#4b5563" font-size="9" font-family="monospace" class="svg-label">${item.label}</text>`
  }).join('')

  const legend = [['Covered','#34d399'],['Partial','#fbbf24'],['Missing','#f87171']].map(([l,c], i) =>
    `<rect x="${padL + i * 90}" y="${padT + H + 22}" width="8" height="8" fill="${c}" rx="2"/>` +
    `<text x="${padL + i * 90 + 12}" y="${padT + H + 26}" dominant-baseline="central" fill="#6b7280" font-size="9" font-family="system-ui">${l}</text>`
  ).join('')

  return `<svg class="svg-chart" viewBox="0 0 ${width} ${height + legendH}" width="${width}" height="${height + legendH}" style="display:block;">
  ${bars}${legend}
</svg>`
}

// ── Additional SVG chart generators ──────────────────────────────────────────

/** Semicircle readiness gauge */
function svgGauge(score, W = 200, H = 118) {
  const cx = W / 2, cy = H - 8, R = 76, sw = 14
  const s   = Math.min(10, Math.max(0, score || 0))
  const hex = scoreColor(s)
  const scoreToAngle = sc => Math.PI * (1 - sc / 10)
  const ptX = a => cx + R * Math.cos(a)
  const ptY = a => cy - R * Math.sin(a)
  const zoneArc = (s1, s2) => {
    const a1 = scoreToAngle(s1), a2 = scoreToAngle(s2)
    return `M ${ptX(a1).toFixed(2)} ${ptY(a1).toFixed(2)} A ${R} ${R} 0 0 1 ${ptX(a2).toFixed(2)} ${ptY(a2).toFixed(2)}`
  }
  const na = scoreToAngle(s)
  const nLen = R - sw - 6
  const nx = (cx + nLen * Math.cos(na)).toFixed(2)
  const ny = (cy - nLen * Math.sin(na)).toFixed(2)
  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;">
  <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" fill="none" stroke="#1f2937" stroke-width="${sw}" stroke-linecap="round" class="svg-ring-bg"/>
  <path d="${zoneArc(0,5)}"  fill="none" stroke="#450a0a" stroke-width="${sw}" stroke-opacity="0.85"/>
  <path d="${zoneArc(5,7)}"  fill="none" stroke="#451a03" stroke-width="${sw}" stroke-opacity="0.85"/>
  <path d="${zoneArc(7,10)}" fill="none" stroke="#052e16" stroke-width="${sw}" stroke-opacity="0.85"/>
  <path d="${zoneArc(0, s)}" fill="none" stroke="${hex}" stroke-width="${sw}" stroke-linecap="round"/>
  ${[5,7].map(tick => {
    const a = scoreToAngle(tick)
    const ox = Math.cos(a), oy = -Math.sin(a)
    return `<line x1="${(cx+(R-sw/2+1)*ox).toFixed(2)}" y1="${(cy+(R-sw/2+1)*oy).toFixed(2)}" x2="${(cx+(R+sw/2+3)*ox).toFixed(2)}" y2="${(cy+(R+sw/2+3)*oy).toFixed(2)}" stroke="#4b5563" stroke-width="1.5"/>`
  }).join('')}
  ${[{v:0,lbl:'0'},{v:5,lbl:'5'},{v:7,lbl:'7'},{v:10,lbl:'10'}].map(({v,lbl}) => {
    const a = scoreToAngle(v), lr = R + sw + 10
    return `<text x="${(cx+lr*Math.cos(a)).toFixed(2)}" y="${(cy-lr*Math.sin(a)+3).toFixed(2)}" text-anchor="middle" fill="#4b5563" font-size="9" font-family="monospace" class="svg-label">${lbl}</text>`
  }).join('')}
  <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${hex}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="6" fill="${hex}"/>
  <circle cx="${cx}" cy="${cy}" r="3" fill="#030712"/>
  <text x="${cx}" y="${(cy - R*0.42).toFixed(2)}" text-anchor="middle" fill="${hex}" font-size="20" font-family="monospace" font-weight="700">${s.toFixed(1)}</text>
  <text x="${cx}" y="${(cy - R*0.42 + 15).toFixed(2)}" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui" class="svg-label">/10</text>
  <text x="${cx}" y="${(cy + 18).toFixed(2)}" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui" class="svg-label">${s >= 7 ? 'Ready to Send' : s >= 5 ? 'Revise First' : 'Major Revision'}</text>
</svg>`
}

/** Three agent score rings side by side */
function svgAgentTrio(a1, a2, a3, W = 380) {
  const scores = [
    { score: a1, label: 'Completeness', sub: 'Agent 1', color: '#818cf8' },
    { score: a2, label: 'Commercial',   sub: 'Agent 2', color: '#c084fc' },
    { score: a3, label: 'Competitive',  sub: 'Agent 3', color: '#34d399' },
  ]
  const rSize = 96, r = 34, sw = 8, circ = 2 * Math.PI * r
  const colW  = W / 3
  const rings = scores.map((s, i) => {
    const cx = colW * (i + 0.5), cy = rSize / 2 + 4
    const pct = Math.min(1, (s.score || 0) / 10)
    const off = circ * (1 - pct)
    return `
      <circle cx="${cx.toFixed(1)}" cy="${cy}" r="${r}" fill="none" stroke="#1f2937" stroke-width="${sw}" class="svg-ring-bg"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
        transform="rotate(-90 ${cx.toFixed(1)} ${cy})"/>
      <text x="${cx.toFixed(1)}" y="${(cy - 4).toFixed(1)}" text-anchor="middle" fill="${s.color}" font-size="18" font-family="monospace" font-weight="700">${s.score?.toFixed(1)}</text>
      <text x="${cx.toFixed(1)}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="8" font-family="system-ui" class="svg-label">/10</text>
      <text x="${cx.toFixed(1)}" y="${(rSize + 20).toFixed(1)}" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="system-ui" class="svg-label">${s.label}</text>
      <text x="${cx.toFixed(1)}" y="${(rSize + 32).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui" class="svg-label">${s.sub}</text>`
  }).join('')
  const H = rSize + 42
  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;">${rings}</svg>`
}

/** Checklist donut — covered/partial/missing */
function svgChecklistDonut(covered, partial, missing, total, size = 140) {
  if (!total) return ''
  const cx = size / 2, cy = size / 2, r = 50, sw = 18
  const circ = 2 * Math.PI * r
  const segments = [
    { count: covered, color: '#16a34a' },
    { count: partial,  color: '#d97706' },
    { count: missing,  color: '#dc2626' },
  ]
  let cumOff = 0
  const arcs = segments.map(seg => {
    const segL = (seg.count / total) * circ
    const off  = cumOff
    cumOff += segL
    if (!seg.count) return ''
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}"
      stroke-dasharray="${segL.toFixed(2)} ${(circ - segL).toFixed(2)}"
      stroke-dashoffset="${(-off).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})"/>`
  }).join('')
  const pct = Math.round((covered / total) * 100)
  return `<svg class="svg-chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1f2937" stroke-width="${sw}" class="svg-ring-bg"/>
  ${arcs}
  <text x="${cx}" y="${(cy - 4).toFixed(1)}" text-anchor="middle" fill="#34d399" font-size="18" font-family="monospace" font-weight="700">${pct}%</text>
  <text x="${cx}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui" class="svg-label">covered</text>
</svg>`
}

/** Priority vertical bar chart — must/should/next/internal counts */
function svgPriorityColumns(must, should, next, internal, W = 280, H = 120) {
  const cols = [
    { label: 'Must Fix',   count: must,     color: '#f87171' },
    { label: 'Should Fix', count: should,   color: '#fbbf24' },
    { label: 'Next Time',  count: next,     color: '#60a5fa' },
    { label: 'Internal',   count: internal, color: '#9ca3af' },
  ]
  const maxC = Math.max(...cols.map(c => c.count), 1)
  const padL = 12, padR = 12, padT = 18, padB = 30
  const innerW = W - padL - padR, innerH = H - padT - padB
  const barW   = innerW / cols.length - 8

  const bars = cols.map((col, i) => {
    const x    = padL + i * (innerW / cols.length) + (innerW / cols.length - barW) / 2
    const barH = col.count > 0 ? Math.max(4, (col.count / maxC) * innerH) : 0
    const y    = padT + innerH - barH
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${col.color}" rx="3" opacity="0.85"/>
      <text x="${(x + barW/2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="${col.color}" font-size="10" font-family="monospace" font-weight="700">${col.count}</text>
      <text x="${(x + barW/2).toFixed(1)}" y="${(padT + innerH + 14).toFixed(1)}" text-anchor="middle" fill="#6b7280" font-size="8" font-family="system-ui" class="svg-label">${col.label}</text>`
  }).join('')
  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;">${bars}</svg>`
}

/** Score tile grid — colored squares for each section_scorecard entry */
function svgScoreTileGrid(sectionScorecard, W = 460) {
  if (!sectionScorecard) return ''
  const entries = Object.entries(sectionScorecard)
  const cols = 4, tileW = (W - (cols + 1) * 8) / cols, tileH = 50
  const rows = Math.ceil(entries.length / cols)
  const H = rows * (tileH + 8) + 8

  const tiles = entries.map(([key, val], i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const x = 8 + col * (tileW + 8), y = 8 + row * (tileH + 8)
    const hex = scoreColor(val)
    const bgC = val >= 7 ? 'rgba(6,78,59,0.4)' : val >= 5 ? 'rgba(78,60,6,0.4)' : 'rgba(69,10,10,0.4)'
    const bdC = val >= 7 ? '#065f46' : val >= 5 ? '#78350f' : '#7f1d1d'
    const lbl = key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
    const short = lbl.length > 16 ? lbl.slice(0,15)+'…' : lbl
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${tileW.toFixed(1)}" height="${tileH}" rx="8" fill="${bgC}" stroke="${bdC}" stroke-width="0.8"/>
      <text x="${(x+tileW/2).toFixed(1)}" y="${(y+tileH*0.44).toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="${hex}" font-size="15" font-family="monospace" font-weight="700">${val?.toFixed(1)}</text>
      <text x="${(x+tileW/2).toFixed(1)}" y="${(y+tileH*0.8).toFixed(1)}" text-anchor="middle" fill="#9ca3af" font-size="8" font-family="system-ui" class="svg-label">${short}</text>`
  }).join('')

  const legend = [['#34d399','rgba(6,78,59,0.4)','#065f46','7+ Strong'],['#fbbf24','rgba(78,60,6,0.4)','#78350f','5–7 OK'],['#f87171','rgba(69,10,10,0.4)','#7f1d1d','<5 Weak']].map(([c,bg,bd,lbl], i) =>
    `<rect x="${(8 + i*90).toFixed(1)}" y="${(H).toFixed(1)}" width="10" height="10" fill="${bg}" stroke="${bd}" stroke-width="0.8" rx="3"/>` +
    `<text x="${(22 + i*90).toFixed(1)}" y="${(H+5).toFixed(1)}" dominant-baseline="central" fill="#6b7280" font-size="9" font-family="system-ui" class="svg-label">${lbl}</text>`
  ).join('')

  return `<svg class="svg-chart" viewBox="0 0 ${W} ${H + 16}" width="${W}" height="${H + 16}" style="display:block;">
  ${tiles}${legend}
</svg>`
}

// ── Markdown generators ───────────────────────────────────────────────────────

function execMD(output, session) {
  const { overall_score, verdict, plain_english_summary, agent1_score, agent2_score, agent3_score, top_3_strengths = [], priority_actions } = output
  const mustFix = priority_actions?.must_fix || []
  const lines = [
    `# Executive Summary`,
    `**Proposal:** ${session?.original_filename || '—'}`,
    `**Type:** ${session?.proposal_type || '—'} · ${(session?.client_industry || []).join(', ')}`,
    `**Generated:** ${NOW()}`,
    '',
    `## Verdict: ${verdict}`,
    `**Overall Score:** ${overall_score?.toFixed(1)}/10`,
    plain_english_summary ? `\n> ${plain_english_summary}\n` : '',
    '',
    `## Dimension Scores`,
    `| Dimension | Score |`,
    `|---|---|`,
    `| Completeness & Clarity | ${agent1_score?.toFixed(1)} |`,
    `| Commercial Integrity | ${agent2_score?.toFixed(1)} |`,
    `| Competitive Strength | ${agent3_score?.toFixed(1)} |`,
    '',
    mustFix.length > 0 ? `## Critical Fixes (${mustFix.length})\n${mustFix.map((f, i) => `${i+1}. ${f.action}`).join('\n')}` : '## No Critical Issues\n✅ Proposal is ready to submit.',
    '',
    top_3_strengths.length > 0 ? `## Top Strengths\n${top_3_strengths.map((s, i) => `${i+1}. ${s}`).join('\n')}` : '',
  ]
  return lines.filter(l => l != null).join('\n')
}

function dashboardMD(output, session) {
  const { overall_score, verdict, agent1_score, agent2_score, agent3_score, priority_actions, checklist_coverage = [], section_scorecard, double_flagged_issues = [] } = output
  const allActions = [
    ...((priority_actions?.must_fix || []).map(a => ({ tier: 'Must Fix', ...a }))),
    ...((priority_actions?.should_fix || []).map(a => ({ tier: 'Should Fix', ...a }))),
    ...((priority_actions?.next_time || []).map(a => ({ tier: 'Next Time', ...a }))),
  ]
  const lines = [
    `# Analyst Dashboard`,
    `**Proposal:** ${session?.original_filename || '—'}`,
    `**Generated:** ${NOW()}`,
    '',
    `## Scores`,
    `| Dimension | Score |`,
    `|---|---|`,
    `| Overall | ${overall_score?.toFixed(1)} |`,
    `| Completeness & Clarity | ${agent1_score?.toFixed(1)} |`,
    `| Commercial Integrity | ${agent2_score?.toFixed(1)} |`,
    `| Competitive Strength | ${agent3_score?.toFixed(1)} |`,
    `| **Verdict** | **${verdict}** |`,
    '',
    section_scorecard ? `## Section Scorecard\n${Object.entries(section_scorecard).map(([k,v]) => `- ${k.replace(/_/g,' ')}: **${v?.toFixed(1)}**`).join('\n')}` : '',
    '',
    `## Priority Actions`,
    `| Priority | Action | Source |`,
    `|---|---|---|`,
    ...allActions.map(a => `| ${a.tier} | ${a.action} | ${(a.source_agents||[]).join(', ')} |`),
    '',
    checklist_coverage.length > 0 ? `## Checklist Coverage\n| ID | Topic | Sheet | Status |\n|---|---|---|---|\n${checklist_coverage.map(c => `| ${c.id} | ${c.topic} | ${c.sheet} | ${c.status} |`).join('\n')}` : '',
    '',
    double_flagged_issues.length > 0 ? `## Double-Flagged Issues\n${double_flagged_issues.map((i, idx) => `${idx+1}. ${i.issue_summary} _(${(i.agents||[]).join(', ')})_`).join('\n')}` : '',
  ]
  return lines.filter(l => l != null).join('\n')
}

function storyboardMD(output, session) {
  const { overall_score, verdict, agent1_score, agent2_score, agent3_score, priority_actions, top_3_strengths = [] } = output
  const mustFix = priority_actions?.must_fix || []
  const lines = [
    `# Analysis Storyboard`,
    `**Proposal:** ${session?.original_filename || '—'}`,
    `**Generated:** ${NOW()}`,
    '',
    `## Chapter 1 — Clarity & Completeness (${agent1_score?.toFixed(1)}/10)`,
    `Agent 1 reviewed the proposal for completeness and clarity. The proposal was assessed against the full evaluation checklist — checking writing quality, scope definition, and whether all required sections are present.`,
    '',
    `## Chapter 2 — Commercial Integrity (${agent2_score?.toFixed(1)}/10)`,
    `Agent 2 examined the commercial and estimation structure. The review covered pricing completeness, phase coverage, estimation methodology, and arithmetic accuracy.`,
    '',
    `## Chapter 3 — Competitive Strength (${agent3_score?.toFixed(1)}/10)`,
    `Agent 3 evaluated positioning and differentiation. The analysis focused on differentiation, alignment with client priorities, narrative flow, credibility, and risk transparency.`,
    '',
    `## Chapter 4 — The Verdict (${overall_score?.toFixed(1)}/10)`,
    `**${verdict}**`,
    top_3_strengths.length > 0 ? `\nStrengths: ${top_3_strengths.slice(0,2).join('; ')}` : '',
    mustFix.length > 0 ? `\n${mustFix.length} issue(s) must be addressed before submission.` : '\nNo critical issues were identified.',
    '',
    `## Risk Summary`,
    verdict === 'READY TO SEND'
      ? 'This proposal is strong enough to submit. Minor polish will improve the score further.'
      : verdict === 'NEEDS MAJOR REVISION' || verdict === 'DO NOT SEND'
      ? 'Submitting in the current state carries a high risk of rejection. A thorough revision is strongly recommended.'
      : `Addressing the ${mustFix.length} critical issue(s) before submission is strongly recommended.`,
    '',
    mustFix.length > 0 ? `### Minimum Viable Fixes\n${mustFix.slice(0,3).map((f,i) => `${i+1}. ${f.action}`).join('\n')}` : '',
  ]
  return lines.filter(l => l != null).join('\n')
}

function comparisonMD(curr, prev) {
  const cO = curr.agent4_output, pO = prev.agent4_output
  if (!cO || !pO) return ''
  const cV = curr.version_number || '?', pV = prev.version_number || '?'
  const improved = (curr.checklist_coverage || cO.checklist_coverage || []).filter(c => {
    const p = (prev.checklist_coverage || pO.checklist_coverage || []).find(x => x.id === c.id)
    return p && p.status !== 'COVERED' && c.status === 'COVERED'
  })
  const lines = [
    `# Comparison Report: V${pV} → V${cV}`,
    `**Proposal:** ${curr.original_filename || '—'}`,
    `**Generated:** ${NOW()}`,
    '',
    `## Verdict Progression`,
    `V${pV}: **${pO.verdict}** → V${cV}: **${cO.verdict}**`,
    '',
    `## Score Delta`,
    `| Dimension | V${pV} | V${cV} | Change |`,
    `|---|---|---|---|`,
    ...['Overall Score|overall_score','Clarity|agent1_score','Commercial|agent2_score','Competitive|agent3_score'].map(pair => {
      const [label, key] = pair.split('|')
      const p = pO[key], c = cO[key]
      const d = (c - p)
      return `| ${label} | ${p?.toFixed(1)} | ${c?.toFixed(1)} | ${d > 0 ? '+' : ''}${d.toFixed(1)} |`
    }),
    '',
    improved.length > 0 ? `## Newly Covered Items (${improved.length})\n${improved.map(i => `- ✅ ${i.id} — ${i.topic}`).join('\n')}` : '## No newly covered checklist items.',
  ]
  return lines.filter(l => l != null).join('\n')
}

function compAllMD(versions) {
  const completed = versions.filter(v => v.status === 'complete' && v.agent4_output)
  if (completed.length < 2) return ''
  const lines = [
    `# Comparison Dashboard — All Versions`,
    `**Generated:** ${NOW()}`,
    '',
    `## Score Progression`,
    `| Version | Overall | Clarity | Commercial | Competitive | Verdict | Must Fix |`,
    `|---|---|---|---|---|---|---|`,
    ...completed.map(v => {
      const o = v.agent4_output
      return `| V${v.version_number} | ${o.overall_score?.toFixed(1)} | ${o.agent1_score?.toFixed(1)} | ${o.agent2_score?.toFixed(1)} | ${o.agent3_score?.toFixed(1)} | ${o.verdict} | ${o.priority_actions?.must_fix?.length || 0} |`
    }),
    '',
    `## Summary`,
    `${completed.length} versions analyzed.`,
    `V${completed[0].version_number} → V${completed[completed.length-1].version_number}: ` +
    `Overall ${(completed[completed.length-1].agent4_output.overall_score - completed[0].agent4_output.overall_score) > 0 ? '+' : ''}${(completed[completed.length-1].agent4_output.overall_score - completed[0].agent4_output.overall_score).toFixed(1)}`,
  ]
  return lines.join('\n')
}

// ── Shared style + layout ─────────────────────────────────────────────────────

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:system-ui,-apple-system,sans-serif;background:#030712;color:#f1f5f9;max-width:920px;margin:0 auto;padding:40px 24px;line-height:1.6;}
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
  .chart-wrap{display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;}
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
    .v-ready  { background:#dcfce7!important; border-color:#16a34a!important; color:#15803d!important; }
    .v-revise { background:#fef9c3!important; border-color:#ca8a04!important; color:#92400e!important; }
    .v-major  { background:#fee2e2!important; border-color:#dc2626!important; color:#991b1b!important; }
    .delta-pos { color:#15803d!important; }
    .delta-neg { color:#b91c1c!important; }
    .delta-flat{ color:#6b7280!important; }
    .chapter { border-left-color:#cbd5e1!important; }
    .pull { border-left-color:#cbd5e1!important; color:#64748b!important; }
    .fix-box { background:#eff6ff!important; border-color:#bfdbfe!important; color:#1d4ed8!important; }
    .num-dot { background:#fee2e2!important; color:#b91c1c!important; }
    .str-dot { background:#dcfce7!important; color:#15803d!important; }
    .slide-page { page-break-after:always; border-radius:0!important; }
    /* SVG chart print overrides */
    .svg-chart .svg-grid  { stroke:#e2e8f0!important; }
    .svg-chart .svg-bg    { fill:#f1f5f9!important; }
    .svg-chart .svg-label { fill:#64748b!important; }
    .svg-chart .svg-ring-bg { stroke:#e2e8f0!important; }
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

export function downloadExecutiveView(output, session, format = 'pdf') {
  if (!output) return
  const {
    overall_score, verdict, plain_english_summary,
    agent1_score, agent2_score, agent3_score,
    top_3_strengths = [], priority_actions,
    section_scorecard,
  } = output

  const mustFix  = (priority_actions?.must_fix || []).slice(0, 3)
  const scorePct = ((overall_score / 10) * 100).toFixed(0)
  const slug     = session?.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON({ session_id: session?.id, version: session?.version_number, filename: session?.original_filename, overall_score, verdict, agent1_score, agent2_score, agent3_score, plain_english_summary, top_3_strengths, must_fix: priority_actions?.must_fix || [] }, `executive_${slug}.json`)
  }
  if (format === 'md') {
    return triggerDownload(execMD(output, session), `executive_${slug}.md`, 'text/markdown')
  }

  const tls = [
    { label: 'Clarity & Completeness', score: agent1_score, desc: 'Writing, scope & completeness' },
    { label: 'Commercial Strength',    score: agent2_score, desc: 'Pricing, estimates & terms' },
    { label: 'Competitive Position',   score: agent3_score, desc: 'Differentiation & client fit' },
  ]

  const tlHtml = tls.map(tl => {
    const c    = scoreColor(tl.score)
    const icon = tl.score >= 7 ? '✓' : tl.score >= 5 ? '~' : '✕'
    return `<div class="tl-block">
      <div class="tl-circle" style="background:${c}22;color:${c};font-size:18px;">${icon}</div>
      <div style="font-weight:700;margin-bottom:4px;">${tl.label}</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">${tl.desc}</div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;color:${c}">${tl.score?.toFixed(1)}</div>
      <div style="font-size:10px;color:#6b7280;">/10</div>
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
        const icons  = ['✦','✧','◈'], colors = ['#34d399','#2dd4bf','#6ee7b7']
        return `<div class="item">
          <div class="num-dot str-dot" style="background:${colors[i]}22;color:${colors[i]};">${icons[i]}</div>
          <div style="font-size:13px;color:#e5e7eb;">${s}</div>
        </div>`
      }).join('')

  const readinessText = overall_score >= 7.5 ? 'Ready — minor polish only'
    : overall_score >= 6   ? 'Almost ready — fix key issues first'
    : overall_score >= 4.5 ? 'Needs moderate revisions'
    : 'Requires significant rework'

  // Radar scores from section_scorecard or agent sub-scores
  const radarScores = section_scorecard
    ? Object.entries(section_scorecard).slice(0, 8).map(([k,v]) => ({ label: k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()), value: v }))
    : [
        { label: 'Clarity', value: agent1_score },
        { label: 'Commercial', value: agent2_score },
        { label: 'Competitive', value: agent3_score },
      ]

  const body = `
    <h1>${session?.original_filename || 'Proposal Review'}</h1>
    <p style="color:#6b7280;font-size:12px;">${session?.proposal_type || ''} · ${(session?.client_industry || []).join(', ')}</p>

    <h2>Verdict &amp; Overall Score</h2>
    <div class="card">
      <div class="chart-wrap">
        <div style="text-align:center;">${svgScoreRing(overall_score, 130)}</div>
        <div style="flex:1;min-width:200px;">
          <span class="badge ${verdictClass(verdict)}">${verdict}</span>
          <p style="margin-top:12px;">${plain_english_summary || ''}</p>
          <div class="bar-track" style="margin-top:14px;">
            <div class="bar-fill" style="width:${scorePct}%;background:${scoreColor(overall_score)};"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#4b5563;margin-top:4px;">
            <span>0</span><span>5.0</span><span>7.0 Ready</span><span>10</span>
          </div>
        </div>
        ${radarScores.length >= 3 ? `<div>${svgRadar(radarScores, 220)}</div>` : ''}
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
  const doc = htmlDoc('Executive Summary', body)
  if (format === 'html') return downloadAsHTML(doc, `executive_${slug}.html`)
  openAsPDF(doc, `executive_${slug}`)
}

// ── 2. Dashboard View ─────────────────────────────────────────────────────────

export function downloadDashboardView(output, session, format = 'pdf') {
  if (!output) return
  const {
    overall_score, verdict, agent1_score, agent2_score, agent3_score,
    priority_actions, checklist_coverage = [], section_scorecard,
    double_flagged_issues = [], cross_consistency_issues = [],
    weight_adjusted, weight_label, weight_reason,
  } = output
  const slug = session?.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON({ session_id: session?.id, overall_score, verdict, agent1_score, agent2_score, agent3_score, section_scorecard, priority_actions, checklist_coverage, double_flagged_issues, cross_consistency_issues }, `dashboard_${slug}.json`)
  }
  if (format === 'md') {
    return triggerDownload(dashboardMD(output, session), `dashboard_${slug}.md`, 'text/markdown')
  }

  const kpiRows = [
    { label: 'Overall Score',          score: overall_score, note: verdict },
    { label: 'Completeness & Clarity', score: agent1_score,  note: 'Agent 1' },
    { label: 'Commercial Integrity',   score: agent2_score,  note: 'Agent 2' },
    { label: 'Competitive Strength',   score: agent3_score,  note: 'Agent 3' },
  ].map(r => `<tr>
    <td>${r.label}</td>
    <td style="font-family:monospace;font-weight:700;color:${scoreColor(r.score)}">${r.score?.toFixed(1)}</td>
    <td>${r.note}</td>
    <td><div class="bar-track"><div class="bar-fill" style="width:${((r.score/10)*100).toFixed(0)}%;background:${scoreColor(r.score)};"></div></div></td>
  </tr>`).join('')

  const tiers = [
    { key: 'must_fix',   label: 'Must Fix'   },
    { key: 'should_fix', label: 'Should Fix' },
    { key: 'next_time',  label: 'Next Time'  },
  ]
  const actionRows = tiers.flatMap(t =>
    (priority_actions?.[t.key] || []).map(item => `<tr>
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
      if (item.status === 'COVERED')      bySheet[item.sheet].covered++
      else if (item.status === 'PARTIAL') bySheet[item.sheet].partial++
      else                                bySheet[item.sheet].missing++
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

  // Radar from section_scorecard
  const radarScores = section_scorecard
    ? Object.entries(section_scorecard).slice(0, 10).map(([k,v]) => ({ label: k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).slice(0,14), value: v }))
    : null

  // ── New chart generators ──────────────────────────────────────────────────
  const gaugeChart    = svgGauge(overall_score, 200, 118)
  const agentTrio     = svgAgentTrio(agent1_score, agent2_score, agent3_score, 380)
  const clTotal       = checklist_coverage.length || 1
  const clCovered     = checklist_coverage.filter(c => c.status === 'COVERED').length
  const clPartial     = checklist_coverage.filter(c => c.status === 'PARTIAL').length
  const clMissing     = checklist_coverage.filter(c => c.status === 'MISSING').length
  const donutChart    = svgChecklistDonut(clCovered, clPartial, clMissing, clTotal, 140)
  const priorityCols  = svgPriorityColumns(
    priority_actions?.must_fix?.length || 0,
    priority_actions?.should_fix?.length || 0,
    priority_actions?.next_time?.length || 0,
    priority_actions?.internal?.length || 0,
  )
  const tileGrid      = section_scorecard ? svgScoreTileGrid(section_scorecard, 460) : ''
  const agentBars     = svgHBars([
    { label: 'Overall',     value: overall_score, color: '#6366f1' },
    { label: 'Clarity',     value: agent1_score,  color: '#818cf8' },
    { label: 'Commercial',  value: agent2_score,  color: '#c084fc' },
    { label: 'Competitive', value: agent3_score,  color: '#34d399' },
  ], 380)
  const infoStyle = 'font-size:10px;color:#6b7280;font-style:italic;margin-top:-6px;margin-bottom:10px;'

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
    <p style="${infoStyle}">Weighted combination of all three agent scores. 7+ = ready, 5–7 = revise, below 5 = major revision.</p>
    <div class="card">
      <div class="chart-wrap">
        <div style="flex:1;min-width:240px;">
          <table><thead><tr><th>Dimension</th><th>Score</th><th>Source</th><th style="width:120px;">Bar</th></tr></thead>
          <tbody>${kpiRows}</tbody></table>
        </div>
        ${agentBars ? `<div>${agentBars}</div>` : ''}
      </div>
    </div>

    <h2>Readiness Gauge</h2>
    <p style="${infoStyle}">Semicircle gauge — needle points to the overall score. Red = major revision, Amber = revise first, Green = ready to send.</p>
    <div class="card" style="display:flex;align-items:center;gap:32px;flex-wrap:wrap;">
      ${gaugeChart}
      <div style="flex:1;min-width:180px;">
        <div style="font-size:28px;font-weight:800;font-family:monospace;color:${scoreColor(overall_score)}">${overall_score?.toFixed(1)}<span style="font-size:14px;color:#6b7280;font-weight:400;">/10</span></div>
        <span class="badge ${overall_score >= 7 ? 'v-ready' : overall_score >= 5 ? 'v-revise' : 'v-major'}">${overall_score >= 7 ? 'Ready to Send' : overall_score >= 5 ? 'Revise Before Sending' : 'Needs Major Revision'}</span>
      </div>
    </div>

    <h2>Agent Score Rings</h2>
    <p style="${infoStyle}">Each ring represents one specialist agent. The filled arc shows the score — a complete ring is a perfect 10.</p>
    <div class="card" style="display:flex;justify-content:center;">${agentTrio}</div>

    <div class="grid2" style="margin-top:0;">
      <div>
        <h2>Checklist Overview</h2>
        <p style="${infoStyle}">Donut showing % of checklist items fully covered across all three proposal sheets.</p>
        <div class="card" style="display:flex;align-items:center;gap:20px;">
          ${donutChart}
          <div>
            <div style="margin-bottom:8px;font-size:12px;"><span style="color:#34d399;font-weight:700;">${clCovered}</span> Covered</div>
            <div style="margin-bottom:8px;font-size:12px;"><span style="color:#fbbf24;font-weight:700;">${clPartial}</span> Partial</div>
            <div style="font-size:12px;"><span style="color:#f87171;font-weight:700;">${clMissing}</span> Missing</div>
          </div>
        </div>
      </div>
      <div>
        <h2>Action Items Distribution</h2>
        <p style="${infoStyle}">Taller bars = more work in that tier. Fewer Must Fix bars = proposal is closer to submission-ready.</p>
        <div class="card">${priorityCols}</div>
      </div>
    </div>

    ${tileGrid ? `
    <h2>Sub-score Heat Map</h2>
    <p style="${infoStyle}">Each tile is one evaluation dimension. Green = strong (7+), Amber = acceptable (5–7), Red = needs work (below 5).</p>
    <div class="card">${tileGrid}</div>` : ''}

    ${radarScores && radarScores.length >= 3 ? `
    <h2>Sub-score Radar</h2>
    <p style="${infoStyle}">Spider chart overlaying all sub-dimension scores. A wider polygon = stronger proposal across the board.</p>
    <div class="card" style="display:flex;justify-content:center;">${svgRadar(radarScores, 280)}</div>` : ''}

    <h2>Checklist Coverage by Sheet</h2>
    <p style="${infoStyle}">How many checklist items are covered, partially addressed, or missing for each of the three proposal sheets.</p>
    <div class="card">
      <table><thead><tr><th>Sheet</th><th>Covered</th><th>Partial</th><th>Missing</th><th>Total</th><th style="width:140px;">Progress</th></tr></thead>
      <tbody>${clRows}</tbody></table>
    </div>

    ${section_scorecard ? `<h2>Dimension Breakdown</h2>
    <div class="card"><table><thead><tr><th>Dimension</th><th>Score</th><th style="width:200px;">Bar</th></tr></thead>
    <tbody>${dimRows}</tbody></table></div>` : ''}

    <h2>Priority Action Plan</h2>
    <div class="card">
      <table><thead><tr><th>Priority</th><th>Action Required</th><th>Source Agents</th></tr></thead>
      <tbody>${actionRows || '<tr><td colspan="3" style="color:#6b7280;">No action items found.</td></tr>'}</tbody></table>
    </div>

    ${double_flagged_issues.length > 0 ? `<h2>Double-Flagged Issues (${double_flagged_issues.length})</h2>
    <p style="${infoStyle}">Issues flagged independently by two or more agents — highest-confidence problems.</p>
    <div class="card">
      ${double_flagged_issues.map(i => `<div class="item" style="margin-bottom:12px;">
        <div class="num-dot">!</div>
        <div><div style="font-size:13px;color:#e5e7eb;">${i.issue_summary}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${(i.agents||[]).join(' · ')}</div></div>
      </div>`).join('')}
    </div>` : ''}
  `
  const doc = htmlDoc('Analyst Dashboard', body)
  if (format === 'html') return downloadAsHTML(doc, `dashboard_${slug}.html`)
  openAsPDF(doc, `dashboard_${slug}`)
}

// ── 3. In-Depth View ──────────────────────────────────────────────────────────

export function downloadInDepthView(output, session, format = 'md') {
  if (!output) return
  const slug = session?.id?.slice(0, 8) || 'report'
  const a4 = output

  if (format === 'json') {
    return downloadAsJSON(a4, `indepth_${slug}.json`)
  }

  if (format === 'html') {
    // Generate an HTML version of the indepth markdown
    const md = buildInDepthMD(a4, session)
    const escaped = md.replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const body = `<div style="font-family:monospace;font-size:13px;white-space:pre-wrap;color:#d1d5db;line-height:1.8;">${escaped}</div>`
    return downloadAsHTML(htmlDoc('In-Depth Analysis', body), `indepth_${slug}.html`)
  }

  // Default: markdown
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

  triggerDownload(lines.filter(l => l !== '').join('\n'), `indepth_${slug}.md`, 'text/markdown')
}

function buildInDepthMD(a4, session) {
  const lines = [
    `# In-Depth Analysis`,
    `Proposal: ${session?.original_filename || '—'}`,
    `Generated: ${NOW()}`,
    '',
    `## Verdict: ${a4.verdict}  (${a4.overall_score?.toFixed(1)}/10)`,
    a4.plain_english_summary || '',
    '',
    ...(['must_fix','should_fix','next_time'].flatMap(tier => {
      const items = a4.priority_actions?.[tier] || []
      if (!items.length) return []
      return [`### ${tier.replace(/_/g,' ')}`, ...items.map((x,i) => `${i+1}. ${x.action}`), '']
    })),
  ]
  return lines.join('\n')
}

// ── 4. Storyboard View ────────────────────────────────────────────────────────

export function downloadStoryboardView(output, session, format = 'pdf') {
  if (!output) return
  const { overall_score, verdict, agent1_score, agent2_score, agent3_score, priority_actions, top_3_strengths = [] } = output
  const mustFix = priority_actions?.must_fix || []
  const slug = session?.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON({ session_id: session?.id, overall_score, verdict, agent1_score, agent2_score, agent3_score }, `storyboard_${slug}.json`)
  }
  if (format === 'md') {
    return triggerDownload(storyboardMD(output, session), `storyboard_${slug}.md`, 'text/markdown')
  }

  const chapters = [
    { num: 1, title: 'Clarity & Completeness', score: agent1_score, agent: 'Agent 1',
      body: `Agent 1 reviewed the proposal for completeness and clarity, giving it ${agent1_score?.toFixed(1)}/10. The proposal was assessed against the full evaluation checklist — checking writing quality, scope definition, and whether all required sections are present and clearly articulated.` },
    { num: 2, title: 'Commercial Integrity', score: agent2_score, agent: 'Agent 2',
      body: `Agent 2 examined the commercial and estimation structure, scoring ${agent2_score?.toFixed(1)}/10. The review covered pricing completeness, phase coverage, estimation methodology, and arithmetic accuracy across the cost model.` },
    { num: 3, title: 'Competitive Strength', score: agent3_score, agent: 'Agent 3',
      body: `Agent 3 evaluated how well the proposal positions this team against competitors, scoring ${agent3_score?.toFixed(1)}/10. The analysis focused on differentiation, alignment with client priorities, narrative flow, credibility, and risk transparency.` },
    { num: 4, title: 'The Overall Verdict', score: overall_score, agent: 'Agent 4 — Chief Proposal Review Officer',
      body: `After synthesising all three specialist reports, Agent 4 assigned an overall score of ${overall_score?.toFixed(1)}/10 and a verdict of ${verdict}. ${top_3_strengths.length > 0 ? `The proposal's genuine strengths include: ${top_3_strengths.slice(0,2).join('; ')}.` : ''} ${mustFix.length > 0 ? `${mustFix.length} issue(s) must be addressed before submission.` : 'No critical issues were identified.'}` },
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

  const scoreBarChart = svgHBars([
    { label: 'Clarity',       value: agent1_score,  color: '#818cf8' },
    { label: 'Commercial',    value: agent2_score,  color: '#c084fc' },
    { label: 'Competitive',   value: agent3_score,  color: '#34d399' },
    { label: 'Overall',       value: overall_score, color: '#6366f1' },
  ], 360)

  const verdCls = verdictClass(verdict)
  const body = `
    <h1>${session?.original_filename || 'Proposal Review'}</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">
      ${session?.proposal_type || ''} · ${(session?.client_industry||[]).join(', ')}
    </p>

    <h2>Score at a Glance</h2>
    <div class="card">
      <div class="chart-wrap">
        ${svgScoreRing(overall_score, 110)}
        <div style="flex:1;">${scoreBarChart}</div>
      </div>
    </div>

    ${chapHtml}

    <h2>What happens if you submit as-is?</h2>
    <div class="card" style="border-left:3px solid ${scoreColor(overall_score)};">
      <span class="badge ${verdCls}">${verdict}</span>
      <p style="margin-top:12px;">${riskText}</p>
      ${mustFix.length > 0 ? `<div style="margin-top:14px;"><div class="score-label">Minimum Viable Fixes</div>${minViableFixes}</div>` : ''}
    </div>
  `
  const doc = htmlDoc('Analysis Storyboard', body)
  if (format === 'html') return downloadAsHTML(doc, `storyboard_${slug}.html`)
  openAsPDF(doc, `storyboard_${slug}`)
}

// ── 5. Action Plan View ───────────────────────────────────────────────────────

export function downloadActionPlanView(output, session, format = 'csv') {
  if (!output?.priority_actions) return
  const slug = session?.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON({ priority_actions: output.priority_actions, checklist_coverage: output.checklist_coverage }, `action_plan_${slug}.json`)
  }

  // Default: CSV
  const tiers = [
    { key: 'must_fix',   label: 'Must Fix'   },
    { key: 'should_fix', label: 'Should Fix' },
    { key: 'next_time',  label: 'Next Time'  },
    { key: 'internal',   label: 'Internal'   },
  ]
  const headers = ['Priority', 'Action', 'Why', 'Source Agents', 'Status']
  const rows = tiers.flatMap(t =>
    (output.priority_actions[t.key] || []).map(item => [
      t.label,
      `"${(item.action||'').replace(/"/g,'""')}"`,
      `"${(item.why||'').replace(/"/g,'""')}"`,
      (item.source_agents||[]).join('; '),
      'Pending',
    ])
  )
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  triggerDownload(csv, `action_plan_${slug}.csv`, 'text/csv')
}

// ── 6. Presentation View ──────────────────────────────────────────────────────

export function downloadPresentationView(output, session, format = 'pdf') {
  if (!output) return
  const { overall_score, verdict, plain_english_summary, top_3_strengths = [], priority_actions, agent1_score, agent2_score, agent3_score } = output
  const mustFix  = (priority_actions?.must_fix || []).slice(0, 4)
  const slug = session?.id?.slice(0, 8) || 'report'

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
      <div class="chart-wrap" style="justify-content:center;gap:40px;align-items:center;">
        ${svgScoreRing(overall_score, 120)}
        <div>
          ${scoreBarHtml('Completeness', agent1_score, '#818cf8')}
          ${scoreBarHtml('Commercial',   agent2_score, '#c084fc')}
          ${scoreBarHtml('Competitive',  agent3_score, '#34d399')}
        </div>
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
      ${scoreBarHtml('Commercial Integrity',   agent2_score, '#c084fc')}
      ${scoreBarHtml('Competitive Strength',   agent3_score, '#34d399')}
      ${scoreBarHtml('Overall Score',          overall_score, scoreColor(overall_score))}
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
  const doc = htmlDoc('Presentation Slides', body)
  if (format === 'html') return downloadAsHTML(doc, `presentation_${slug}.html`)
  openAsPDF(doc, `presentation_${slug}`)
}

// ── 7. Comparison View ────────────────────────────────────────────────────────

export function downloadComparisonView(currentSession, prevSession, format = 'pdf') {
  if (!currentSession?.agent4_output || !prevSession?.agent4_output) return
  const curr = currentSession.agent4_output
  const prev = prevSession.agent4_output
  const cVer = currentSession.version_number || '?'
  const pVer = prevSession.version_number || '?'
  const slug = currentSession.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON({ [`v${pVer}`]: { score: prev.overall_score, verdict: prev.verdict, agent1: prev.agent1_score, agent2: prev.agent2_score, agent3: prev.agent3_score }, [`v${cVer}`]: { score: curr.overall_score, verdict: curr.verdict, agent1: curr.agent1_score, agent2: curr.agent2_score, agent3: curr.agent3_score } }, `comparison_v${pVer}_v${cVer}_${slug}.json`)
  }
  if (format === 'md') {
    return triggerDownload(comparisonMD(currentSession, prevSession), `comparison_v${pVer}_v${cVer}_${slug}.md`, 'text/markdown')
  }

  const deltaHtml = (label, prevS, currS) => {
    const d    = currS - prevS
    const dStr = (d > 0 ? '+' : '') + d.toFixed(1)
    const cls  = d > 0 ? 'delta-pos' : d < 0 ? 'delta-neg' : 'delta-flat'
    return `<tr>
      <td>${label}</td>
      <td style="font-family:monospace;color:${scoreColor(prevS)}">${prevS?.toFixed(1)}</td>
      <td style="font-family:monospace;color:${scoreColor(currS)}">${currS?.toFixed(1)}</td>
      <td style="font-family:monospace;font-weight:700;" class="${cls}">${dStr}</td>
    </tr>`
  }

  const prevMust = prev.priority_actions?.must_fix?.length || 0
  const currMust = curr.priority_actions?.must_fix?.length || 0

  const prevList = prev.checklist_coverage || []
  const currList = curr.checklist_coverage || []
  const improved = currList.filter(c => {
    const p = prevList.find(x => x.id === c.id)
    return p && p.status !== 'COVERED' && c.status === 'COVERED'
  })
  const stillMissing = currList.filter(c => c.status === 'MISSING')

  // Mini bar chart for comparison
  const compBars = svgHBars([
    { label: `V${pVer} Overall`,  value: prev.overall_score, color: '#818cf8' },
    { label: `V${cVer} Overall`,  value: curr.overall_score, color: '#6366f1' },
    { label: `V${pVer} Clarity`,  value: prev.agent1_score,  color: '#818cf8' },
    { label: `V${cVer} Clarity`,  value: curr.agent1_score,  color: '#6366f1' },
    { label: `V${pVer} Commercial`, value: prev.agent2_score, color: '#c084fc' },
    { label: `V${cVer} Commercial`, value: curr.agent2_score, color: '#a78bfa' },
    { label: `V${pVer} Competitive`, value: prev.agent3_score, color: '#34d399' },
    { label: `V${cVer} Competitive`, value: curr.agent3_score, color: '#10b981' },
  ], 400)

  const body = `
    <h1>Comparison Report: V${pVer} → V${cVer}</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">${currentSession.original_filename || ''} · ${NOW()}</p>

    <h2>Score Comparison Chart</h2>
    <div class="card">${compBars}</div>

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
          ${deltaHtml('Overall Score',           prev.overall_score, curr.overall_score)}
          ${deltaHtml('Completeness & Clarity',  prev.agent1_score,  curr.agent1_score)}
          ${deltaHtml('Commercial Integrity',    prev.agent2_score,  curr.agent2_score)}
          ${deltaHtml('Competitive Strength',    prev.agent3_score,  curr.agent3_score)}
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
  `
  const doc = htmlDoc(`Comparison V${pVer} vs V${cVer}`, body)
  if (format === 'html') return downloadAsHTML(doc, `comparison_v${pVer}_v${cVer}_${slug}.html`)
  openAsPDF(doc, `comparison_v${pVer}_v${cVer}_${slug}`)
}

// ── 8. Comparison Dashboard (all versions) ────────────────────────────────────

export function downloadComparisonDashboard(versions, format = 'pdf') {
  const completed = versions.filter(v => v.status === 'complete' && v.agent4_output)
  if (completed.length < 2) return

  const first  = completed[0]
  const latest = completed[completed.length - 1]
  const slug   = first.id?.slice(0, 8) || 'report'

  if (format === 'json') {
    return downloadAsJSON(completed.map(v => ({
      version: v.version_number, filename: v.original_filename,
      overall_score: v.agent4_output.overall_score, verdict: v.agent4_output.verdict,
      agent1_score: v.agent4_output.agent1_score, agent2_score: v.agent4_output.agent2_score, agent3_score: v.agent4_output.agent3_score,
      must_fix_count: v.agent4_output.priority_actions?.must_fix?.length || 0,
    })), `comparison_all_${slug}.json`)
  }
  if (format === 'md') {
    return triggerDownload(compAllMD(versions), `comparison_all_${slug}.md`, 'text/markdown')
  }

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

  // Score trend line chart
  const trendChart = svgLineChart(completed, 460, 170)

  // Checklist stacked bars
  const clItems = completed.map(v => {
    const coverage = v.agent4_output.checklist_coverage || []
    return {
      label: `V${v.version_number}`,
      covered: coverage.filter(c => c.status === 'COVERED').length,
      partial:  coverage.filter(c => c.status === 'PARTIAL').length,
      missing:  coverage.filter(c => c.status === 'MISSING').length,
      total:    coverage.length || 1,
    }
  })
  const stackedChart = clItems.some(i => i.total > 1) ? svgStackedBars(clItems, 460, 120) : ''

  // Issues bar chart
  const issuesBars = svgHBars(completed.map(v => ({
    label: `V${v.version_number} Must Fix`,
    value: Math.min(10, v.agent4_output.priority_actions?.must_fix?.length || 0),
    color: '#f87171',
  })), 380)

  const body = `
    <h1>Comparison Dashboard</h1>
    <p style="color:#6b7280;font-size:12px;margin-bottom:24px;">
      ${completed.length} versions · V${first.version_number} to V${latest.version_number} · ${NOW()}
    </p>

    <h2>Score Trend</h2>
    <div class="card">${trendChart || '<p style="color:#6b7280">Need 2+ versions for trend chart.</p>'}</div>

    <h2>Score Progression Table</h2>
    <div class="card">
      <table>
        <thead><tr><th>Version</th><th>Overall</th><th>Completeness</th><th>Commercial</th><th>Competitive</th><th>Verdict</th><th>Must Fix</th></tr></thead>
        <tbody>${scoreRowsHtml}</tbody>
      </table>
    </div>

    ${stackedChart ? `<h2>Checklist Coverage per Version</h2><div class="card">${stackedChart}</div>` : ''}

    <h2>Issues Count per Version</h2>
    <div class="card">${issuesBars}</div>

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
  const doc = htmlDoc('Comparison Dashboard', body)
  if (format === 'html') return downloadAsHTML(doc, `comparison_all_${slug}.html`)
  openAsPDF(doc, `comparison_all_${slug}`)
}

// ── Master dispatcher ─────────────────────────────────────────────────────────

export function downloadCurrentView({ activeView, sidebarMode, output, session, history, prevSession, format }) {
  if (sidebarMode === 'compare_all') {
    const fmt = format || 'pdf'
    downloadComparisonDashboard(history, fmt)
    return
  }
  const currentIdx = history?.findIndex(v => v.id === session?.id) ?? -1
  const prev = prevSession || (currentIdx > 0 ? history[currentIdx - 1] : null)
  const fmt  = format || VIEW_DOWNLOAD_META[activeView]?.defaultFormat || 'pdf'

  switch (activeView) {
    case 'executive':    return downloadExecutiveView(output, session, fmt)
    case 'dashboard':    return downloadDashboardView(output, session, fmt)
    case 'indepth':      return downloadInDepthView(output, session, fmt)
    case 'storyboard':   return downloadStoryboardView(output, session, fmt)
    case 'actionplan':   return downloadActionPlanView(output, session, fmt)
    case 'presentation': return downloadPresentationView(output, session, fmt)
    case 'comparison':   return downloadComparisonView(
      { ...session, agent4_output: output },
      prev,
      fmt,
    )
    default: return downloadExecutiveView(output, session, fmt)
  }
}

// ── View metadata ─────────────────────────────────────────────────────────────

export const FORMAT_LABELS = {
  pdf:  { label: 'PDF',  icon: '📄', hint: 'Opens print dialog' },
  html: { label: 'HTML', icon: '🌐', hint: 'Download HTML file' },
  md:   { label: 'MD',   icon: '📝', hint: 'Markdown text file' },
  json: { label: 'JSON', icon: '{}', hint: 'Raw JSON data'      },
  csv:  { label: 'CSV',  icon: '📊', hint: 'Spreadsheet file'   },
}

export const VIEW_DOWNLOAD_META = {
  executive:    { label: 'Executive Report',    defaultFormat: 'pdf', formats: ['pdf','html','md','json'] },
  dashboard:    { label: 'Dashboard Report',    defaultFormat: 'pdf', formats: ['pdf','html','md','json'] },
  indepth:      { label: 'Full Analysis',       defaultFormat: 'md',  formats: ['md','html','json']       },
  storyboard:   { label: 'Storyboard',          defaultFormat: 'pdf', formats: ['pdf','html','md']        },
  actionplan:   { label: 'Action Plan',         defaultFormat: 'csv', formats: ['csv','json']             },
  presentation: { label: 'Slide Deck',          defaultFormat: 'pdf', formats: ['pdf','html']             },
  comparison:   { label: 'Comparison Report',   defaultFormat: 'pdf', formats: ['pdf','html','md','json'] },
  compare_all:  { label: 'All Versions Report', defaultFormat: 'pdf', formats: ['pdf','html','md','json'] },
}
