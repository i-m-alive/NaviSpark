import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadDocument, startAnalysis } from '../api/client'
import Navbar from '../components/Navbar'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Upload, FileText, X, AlertCircle, Sparkles,
  RotateCcw, Building2, Tag, Target, ArrowRight, Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'

const INDUSTRY_OPTIONS = [
  'Fintech','Healthcare','Retail','Manufacturing','Government',
  'Education','Logistics','Insurance','Energy','Telecom',
]
const PROPOSAL_TYPE_OPTIONS = [
  'Fixed Price','Time & Material','Managed Services',
  'Staff Augmentation','Consulting','SaaS / Product',
]
const PRIORITY_OPTIONS = [
  'Cost Certainty','Innovation','Speed to Market','Quality',
  'Risk Mitigation','Scalability','Compliance','Support SLA',
]

// ── Floating background orbs ───────────────────────────────────────────────────
function BgOrbs() {
  return (
    <div className="theme-orbs fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute top-1/4 -left-48 w-[480px] h-[480px] rounded-full bg-blue-600/5 blur-3xl animate-float-orb" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-purple-600/5 blur-3xl animate-float-orb-r" />
      <div
        className="absolute top-2/3 left-1/2 w-72 h-72 rounded-full bg-teal-600/4 blur-3xl animate-float-orb"
        style={{ animationDelay: '5s' }}
      />
    </div>
  )
}

// ── Chip ───────────────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick, color = 'blue' }) {
  const on = {
    blue:   'bg-blue-600/15 border-blue-500/70 text-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.22)]',
    purple: 'bg-purple-600/15 border-purple-500/70 text-purple-300 shadow-[0_0_6px_rgba(147,51,234,0.22)]',
    teal:   'bg-teal-600/15 border-teal-500/70 text-teal-300 shadow-[0_0_6px_rgba(20,184,166,0.22)]',
  }
  const off = 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-[11px] px-2.5 py-1 rounded-full border font-medium focus:outline-none active:scale-90',
        selected ? on[color] : off,
      )}
      style={{ transition: 'all 0.18s cubic-bezier(0.34,1.56,0.64,1)', transform: selected ? 'scale(1.05)' : 'scale(1)' }}
    >
      {selected && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 mb-px align-middle" />
      )}
      {label}
    </button>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label, count, color }) {
  const iconCls  = { blue: 'text-blue-400', purple: 'text-purple-400', teal: 'text-teal-400' }
  const cntStyle = {
    blue:   'text-blue-400 bg-blue-950/50 border-blue-900/80',
    purple: 'text-purple-300 bg-purple-950/50 border-purple-900/80',
    teal:   'text-teal-400 bg-teal-950/50 border-teal-900/80',
  }
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon size={11} className={iconCls[color]} />
      <span className="text-[11px] font-semibold text-white tracking-wide">{label}</span>
      {count !== undefined && (
        <span className={clsx('ml-auto text-[9px] px-1.5 py-0.5 rounded-full border font-mono', cntStyle[color])}>
          {count} selected
        </span>
      )}
    </div>
  )
}

// ── Live summary row ───────────────────────────────────────────────────────────
function SummaryRow({ label, value, color }) {
  const dot = { blue: 'bg-blue-500', purple: 'bg-purple-500', teal: 'bg-teal-500', gray: 'bg-gray-600' }
  return (
    <div className="flex items-start gap-2 animate-slide-down">
      <div className={clsx('w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0', dot[color] || dot.gray)} />
      <div className="min-w-0 flex-1">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">{label}: </span>
        <span className="text-[11px] text-gray-300 break-words">{value}</span>
      </div>
    </div>
  )
}

// ── Progress step (during upload) ──────────────────────────────────────────────
function ProgressStep({ msg, done, delay }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  if (!visible) return null
  return (
    <div className="flex items-center gap-2 animate-slide-down">
      <div className={clsx(
        'w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0',
        done ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700',
      )}>
        {done
          ? <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
        }
      </div>
      <span className="text-xs text-gray-400">{msg}</span>
    </div>
  )
}

// ── Animated success checkmark ──────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="relative w-16 h-16 mx-auto">
      {[0, 1].map(i => (
        <div key={i} className="absolute inset-0 rounded-full border border-green-500/20"
          style={{ animation: `ripple 2s ease-out ${i * 0.5}s infinite` }} />
      ))}
      <div
        className="absolute inset-0 rounded-full bg-green-950 border-2 border-green-500 flex items-center justify-center"
        style={{ animation: 'scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none"
          style={{ animation: 'scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
          <path d="M6 16L13 23L26 9" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 36, strokeDashoffset: 0, animation: 'draw-check 0.5s ease 0.3s both' }} />
        </svg>
      </div>
    </div>
  )
}

// ── Start Analysis button ───────────────────────────────────────────────────────
function StartAnalysisButton({ sessionId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const handleClick = async () => {
    setLoading(true)
    setError('')
    try {
      await startAnalysis(sessionId)
      navigate(`/results/${sessionId}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }
  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg text-white relative overflow-hidden disabled:opacity-60"
        style={{
          background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
          boxShadow: '0 0 24px rgba(124,58,237,0.35),0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" /> Starting pipeline…</>
          : <><Sparkles size={14} /> Start AI Analysis</>
        }
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1.5 text-center">{error}</p>}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate     = useNavigate()
  const fileInputRef = useRef(null)

  const [clientIndustry, setClientIndustry] = useState([])
  const [proposalType, setProposalType]     = useState('')
  const [clientPriorities, setPriorities]   = useState([])
  const [file, setFile]                     = useState(null)
  const [dragOver, setDragOver]             = useState(false)

  const [uploadStatus,   setUploadStatus]   = useState('idle')
  const [uploadProgress, setUploadProgress] = useState([])
  const [uploadError,    setUploadError]    = useState('')
  const [resultSessionId, setResultId]      = useState(null)
  const [pageCount,      setPageCount]      = useState(null)

  const toggle = (list, setList, item) =>
    setList(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item])

  const handleFileChange = e => { const f = e.target.files[0]; if (f) setFile(f) }
  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) setFile(f)
  }

  const canSubmit = clientIndustry.length > 0 && proposalType && clientPriorities.length > 0 && file

  const handleUpload = async () => {
    if (!canSubmit) return
    setUploadStatus('uploading')
    setUploadProgress([])
    setUploadError('')
    try {
      setUploadProgress([{ msg: 'Detecting file type…', done: true }])
      await new Promise(r => setTimeout(r, 350))
      setUploadProgress(p => [...p, { msg: 'Uploading to server…', done: true }])
      const data = await uploadDocument({ file, clientIndustry, proposalType, clientPriorities })
      setUploadProgress(p => [...p, { msg: `Processed ${data.page_count} pages`, done: true }])
      await new Promise(r => setTimeout(r, 200))
      setUploadProgress(p => [...p, { msg: 'Proposal created successfully', done: true }])
      setPageCount(data.page_count)
      setResultId(data.session_id)
      await new Promise(r => setTimeout(r, 400))
      setUploadStatus('success')
    } catch (err) {
      setUploadError(err.message)
      setUploadStatus('error')
    }
  }

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : null

  const hasSummary = clientIndustry.length > 0 || proposalType || clientPriorities.length > 0 || file

  // Completion dots for left panel
  const completions = [
    { label: 'Industry & Type', done: clientIndustry.length > 0 && !!proposalType },
    { label: 'Priorities',      done: clientPriorities.length > 0 },
    { label: 'File',            done: !!file },
  ]

  return (
    <div className="min-h-screen auth-bg overflow-hidden relative">
      <BgOrbs />
      <Navbar />

      <main
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 flex items-start lg:items-center"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 py-6">

          {/* ── LEFT PANEL ──────────────────────────────────────── */}
          <div
            className="space-y-3"
            style={{
              opacity: uploadStatus !== 'idle' ? 0.35 : 1,
              pointerEvents: uploadStatus !== 'idle' ? 'none' : 'auto',
              transition: 'opacity 0.4s ease',
              animation: 'slide-in-left 0.5s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            {/* Title */}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-800/50 flex items-center justify-center">
                  <Sparkles size={11} className="text-blue-400" />
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight">New Proposal Review</h1>
              </div>
              <p className="text-xs text-gray-500 ml-8">Fill in context, upload your file, and let AI do the rest.</p>
            </div>

            {/* Completion indicator dots */}
            <div className="flex items-center gap-1 ml-0.5">
              {completions.map(({ label, done }, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={clsx(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    done ? 'bg-green-500 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-gray-700',
                  )} />
                  <span className={clsx(
                    'text-[9px] font-medium uppercase tracking-wider',
                    done ? 'text-green-500' : 'text-gray-400',
                  )}>{label}</span>
                  {i < completions.length - 1 && (
                    <div className={clsx('w-5 h-px mx-1', done ? 'bg-green-800' : 'bg-gray-800')} />
                  )}
                </div>
              ))}
            </div>

            {/* Form card */}
            <div className="auth-card p-4 space-y-3.5">

              {/* Client Industry */}
              <div>
                <SectionLabel icon={Building2} label="Client Industry" count={clientIndustry.length} color="blue" />
                <div className="flex flex-wrap gap-1.5">
                  {INDUSTRY_OPTIONS.map(opt => (
                    <Chip key={opt} label={opt} color="blue"
                      selected={clientIndustry.includes(opt)}
                      onClick={() => toggle(clientIndustry, setClientIndustry, opt)}
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-800/70" />

              {/* Proposal Type */}
              <div>
                <SectionLabel icon={Tag} label="Proposal Type" color="purple"
                  count={proposalType ? undefined : undefined}
                />
                {proposalType && (
                  <p className="text-[9px] text-purple-400 mb-1.5 ml-0.5">Selected: {proposalType}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {PROPOSAL_TYPE_OPTIONS.map(opt => (
                    <Chip key={opt} label={opt} color="purple"
                      selected={proposalType === opt}
                      onClick={() => setProposalType(proposalType === opt ? '' : opt)}
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-800/70" />

              {/* Client Priorities */}
              <div>
                <SectionLabel icon={Target} label="Client Priorities" count={clientPriorities.length} color="teal" />
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map(opt => (
                    <Chip key={opt} label={opt} color="teal"
                      selected={clientPriorities.includes(opt)}
                      onClick={() => toggle(clientPriorities, setPriorities, opt)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────────── */}
          <div
            className="space-y-3"
            style={{ animation: 'slide-in-right 0.5s cubic-bezier(0.16,1,0.3,1) 0.08s both' }}
          >

            {/* ── IDLE ─────────────────────────────────────────── */}
            {uploadStatus === 'idle' && (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={clsx(
                    'relative rounded-2xl p-7 text-center transition-all duration-200 overflow-hidden',
                    dragOver
                      ? 'border-2 border-blue-500 bg-blue-950/20'
                      : file
                      ? 'border-2 border-green-700/60 bg-green-950/10'
                      : 'cursor-pointer border-2 border-dashed border-gray-700 hover:border-indigo-600/50 hover:bg-gray-800/20',
                  )}
                  style={!file && !dragOver ? { animation: 'border-pulse 3s ease-in-out infinite' } : {}}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {dragOver && <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />}

                  {file ? (
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="w-12 h-12 rounded-xl bg-green-950 border border-green-800 flex items-center justify-center mx-auto"
                        style={{ boxShadow: '0 0 16px rgba(52,211,153,0.15)' }}>
                        <FileText size={20} className="text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white truncate max-w-xs mx-auto">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fileSizeMB} MB · {file.name.split('.').pop().toUpperCase()}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null) }}
                        className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2.5 py-0.5 rounded-full transition-colors"
                      >
                        <X size={10} /> Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all duration-200',
                        dragOver ? 'bg-blue-900 border border-blue-700 scale-110' : 'bg-gray-800 border border-gray-700',
                      )}>
                        <Upload size={20} className={dragOver ? 'text-blue-400' : 'text-gray-500'} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">
                          {dragOver ? 'Drop to upload' : 'Drop your proposal here'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">or click to browse · PDF · PPT · PPTX · Max 100 MB</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live summary — appears as fields are filled */}
                {hasSummary && (
                  <div className="auth-card p-3 space-y-2 animate-slide-down">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                      Summary Preview
                    </p>
                    {clientIndustry.length > 0 && (
                      <SummaryRow label="Industries" value={clientIndustry.join(', ')} color="blue" />
                    )}
                    {proposalType && (
                      <SummaryRow label="Proposal Type" value={proposalType} color="purple" />
                    )}
                    {clientPriorities.length > 0 && (
                      <SummaryRow label="Priorities" value={clientPriorities.join(', ')} color="teal" />
                    )}
                    {file && (
                      <SummaryRow label="File" value={`${file.name} (${fileSizeMB} MB)`} color="gray" />
                    )}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleUpload}
                  disabled={!canSubmit}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg',
                    'transition-all duration-300 relative overflow-hidden',
                    canSubmit
                      ? 'text-white'
                      : 'text-gray-400 bg-gray-800/50 border border-gray-700 cursor-not-allowed',
                  )}
                  style={canSubmit ? {
                    background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.35),0 4px 16px rgba(0,0,0,0.4)',
                  } : {}}
                >
                  {canSubmit && (
                    <span
                      className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                      style={{ animation: 'shimmer-sweep 2.5s ease-in-out infinite' }}
                    />
                  )}
                  <Upload size={14} />
                  Upload &amp; Analyse
                </button>

                {/* Inline validation hint */}
                {!canSubmit && (
                  <p className="text-[10px] text-gray-400 text-center -mt-1">
                    Still needed:{' '}
                    {[
                      !clientIndustry.length && 'industry',
                      !proposalType         && 'proposal type',
                      !clientPriorities.length && 'priorities',
                      !file                 && 'file',
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </>
            )}

            {/* ── UPLOADING ────────────────────────────────────── */}
            {uploadStatus === 'uploading' && (
              <div className="auth-card p-5 space-y-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <LoadingSpinner size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white">Processing your proposal…</p>
                    <p className="text-xs text-gray-500">This takes a few seconds</p>
                  </div>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (uploadProgress.length / 4) * 100)}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <div className="space-y-2">
                  {uploadProgress.map((p, i) => (
                    <ProgressStep key={i} msg={p.msg} done={p.done} delay={i * 200} />
                  ))}
                </div>
              </div>
            )}

            {/* ── SUCCESS ──────────────────────────────────────── */}
            {uploadStatus === 'success' && (
              <div className="auth-card p-8 text-center animate-fade-in space-y-4">
                <AnimatedCheck />
                <div>
                  <h2 className="text-base font-bold text-white mt-2">Upload successful!</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Your {pageCount}-page proposal is ready for AI analysis.
                  </p>
                </div>
                <div className="bg-gray-950 rounded-xl border border-gray-800 px-4 py-3 text-left space-y-1.5">
                  {uploadProgress.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.4)" strokeWidth="1"/>
                        <path d="M3.5 6L5.5 8L8.5 4" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {p.msg}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <StartAnalysisButton sessionId={resultSessionId} />
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    Dashboard <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ── ERROR ────────────────────────────────────────── */}
            {uploadStatus === 'error' && (
              <div className="auth-card p-8 text-center animate-fade-in space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-950 border-2 border-red-700 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Upload failed</p>
                  <p className="text-xs text-red-400 mt-1 leading-relaxed">{uploadError}</p>
                </div>
                <button
                  onClick={() => { setUploadStatus('idle'); setUploadProgress([]) }}
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <RotateCcw size={13} /> Try again
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      <style>{`
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes scale-in {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes draw-check {
          from { stroke-dashoffset: 36; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-28px); opacity: 0; filter: blur(4px); }
          to   { transform: translateX(0);     opacity: 1; filter: blur(0); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(28px);  opacity: 0; filter: blur(4px); }
          to   { transform: translateX(0);     opacity: 1; filter: blur(0); }
        }
        @keyframes border-pulse {
          0%, 100% { border-color: rgba(75,85,99,0.5); }
          50%       { border-color: rgba(99,102,241,0.45); }
        }
      `}</style>
    </div>
  )
}
