import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadDocument } from '../api/client'
import Navbar from '../components/Navbar'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Upload, FileText, X, CheckCircle, AlertCircle,
  ChevronRight, ChevronLeft, Sparkles, RotateCcw,
  Building2, Tag, Target, ArrowRight,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Data ───────────────────────────────────────────────────────────────────────
const INDUSTRY_OPTIONS = [
  'Fintech', 'Healthcare', 'Retail', 'Manufacturing', 'Government',
  'Education', 'Logistics', 'Insurance', 'Energy', 'Telecom',
]
const PROPOSAL_TYPE_OPTIONS = [
  'Fixed Price', 'Time & Material', 'Managed Services',
  'Staff Augmentation', 'Consulting', 'SaaS / Product',
]
const PRIORITY_OPTIONS = [
  'Cost Certainty', 'Innovation', 'Speed to Market', 'Quality',
  'Risk Mitigation', 'Scalability', 'Compliance', 'Support SLA',
]

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = ['Context', 'File', 'Upload']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                done   && 'bg-green-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.4)]',
                active && 'bg-blue-600 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)] scale-110',
                !done && !active && 'bg-gray-800 text-gray-500 border border-gray-700',
              )}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className={clsx(
                'text-[10px] font-medium tracking-wide uppercase',
                done   && 'text-green-400',
                active && 'text-blue-400',
                !done && !active && 'text-gray-600',
              )}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx(
                'h-px w-16 mx-3 mt-[-12px] transition-all duration-500',
                i < current ? 'bg-green-600' : 'bg-gray-800'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Chip selector ──────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick, single }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 active:scale-95',
        selected
          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.3)]'
          : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
      )}
    >
      {label}
    </button>
  )
}

// ── Animated checkmark (SVG draw-on) ──────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-2">
      {/* Ripple rings */}
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-green-500/20"
          style={{
            animation: `ripple 2s ease-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
      {/* Main circle */}
      <div className="absolute inset-0 rounded-full bg-green-950 border-2 border-green-500 flex items-center justify-center"
           style={{ animation: 'scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
             style={{ animation: 'scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
          <path
            d="M6 16L13 23L26 9"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 36,
              strokeDashoffset: 0,
              animation: 'draw-check 0.5s ease 0.3s both',
            }}
          />
        </svg>
      </div>
    </div>
  )
}

// ── Progress step ──────────────────────────────────────────────────────────────
function ProgressStep({ msg, done, delay }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) return null
  return (
    <div className="flex items-center gap-2.5 animate-slide-down">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}>
        {done
          ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      </div>
      <span className="text-xs text-gray-400">{msg}</span>
    </div>
  )
}

// ── Summary row ────────────────────────────────────────────────────────────────
function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm text-gray-200 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [step, setStep]                     = useState(0)
  const [clientIndustry, setClientIndustry] = useState([])
  const [proposalType, setProposalType]     = useState('')
  const [clientPriorities, setPriorities]   = useState([])
  const [file, setFile]                     = useState(null)
  const [dragOver, setDragOver]             = useState(false)

  const [uploadStatus, setUploadStatus]     = useState('idle')
  const [uploadProgress, setUploadProgress] = useState([])
  const [uploadError, setUploadError]       = useState('')
  const [resultSessionId, setResultId]      = useState(null)
  const [pageCount, setPageCount]           = useState(null)

  const toggle = (list, setList, item) =>
    setList(p => p.includes(item) ? p.filter(x => x !== item) : [...p, item])

  const handleFileChange = e => { const f = e.target.files[0]; if (f) setFile(f) }
  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) setFile(f)
  }

  const canStep0 = clientIndustry.length > 0 && proposalType && clientPriorities.length > 0
  const canStep1 = !!file

  const handleUpload = async () => {
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

  return (
    <div className="min-h-screen auth-bg">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Page title ────────────────────────────────────────────────────── */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-xl font-bold text-white tracking-tight">New Proposal Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in context, upload your file, and let AI do the rest.</p>
        </div>

        <StepIndicator current={step} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 0 — Context                                                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="auth-card space-y-5 animate-slide-up">

            {/* Industry */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={13} className="text-blue-400" />
                <label className="text-sm font-semibold text-white">Client Industry</label>
                <span className="ml-auto text-[10px] text-blue-400 bg-blue-950 border border-blue-900 px-1.5 py-0.5 rounded-full font-mono">
                  {clientIndustry.length} selected
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2.5">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map(opt => (
                  <Chip key={opt} label={opt}
                    selected={clientIndustry.includes(opt)}
                    onClick={() => toggle(clientIndustry, setClientIndustry, opt)}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-800" />

            {/* Proposal type */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag size={13} className="text-purple-400" />
                <label className="text-sm font-semibold text-white">Proposal Type</label>
                {proposalType && (
                  <span className="ml-auto text-[10px] text-purple-300 bg-purple-950 border border-purple-900 px-1.5 py-0.5 rounded-full">
                    {proposalType}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {PROPOSAL_TYPE_OPTIONS.map(opt => (
                  <Chip key={opt} label={opt}
                    selected={proposalType === opt}
                    onClick={() => setProposalType(proposalType === opt ? '' : opt)}
                    single
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-800" />

            {/* Priorities */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={13} className="text-teal-400" />
                <label className="text-sm font-semibold text-white">Client Priorities</label>
                <span className="ml-auto text-[10px] text-teal-400 bg-teal-950 border border-teal-900 px-1.5 py-0.5 rounded-full font-mono">
                  {clientPriorities.length} selected
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2.5">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <Chip key={opt} label={opt}
                    selected={clientPriorities.includes(opt)}
                    onClick={() => toggle(clientPriorities, setPriorities, opt)}
                  />
                ))}
              </div>
            </div>

            {/* Validation hint */}
            {!canStep0 && (
              <p className="text-[10px] text-gray-600 text-center animate-fade-in">
                Select at least one industry, one proposal type, and one priority to continue.
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setStep(1)}
                disabled={!canStep0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
              >
                Next: Upload File <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 1 — File                                                       */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="auth-card space-y-4 animate-slide-up">

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={clsx(
                'relative rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer overflow-hidden',
                dragOver
                  ? 'border-2 border-blue-500 bg-blue-950/25'
                  : file
                  ? 'border-2 border-green-700 bg-green-950/15'
                  : 'border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Animated gradient glow when dragging */}
              {dragOver && (
                <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
              )}

              {file ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-green-950 border border-green-800 flex items-center justify-center mx-auto">
                    <FileText size={24} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white truncate max-w-xs mx-auto">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{fileSizeMB} MB · {file.name.split('.').pop().toUpperCase()}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1 rounded-full transition-colors"
                  >
                    <X size={11} /> Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all duration-200',
                    dragOver ? 'bg-blue-900 border border-blue-700 scale-110' : 'bg-gray-800 border border-gray-700'
                  )}>
                    <Upload size={22} className={dragOver ? 'text-blue-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">
                      {dragOver ? 'Drop to upload' : 'Drop your proposal here'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">or click to browse your files</p>
                  </div>
                  <p className="text-[10px] text-gray-700 bg-gray-800/50 inline-block px-3 py-1 rounded-full">
                    PDF · PPT · PPTX &nbsp;·&nbsp; Max 100 MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <button onClick={() => setStep(0)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canStep1}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
              >
                Review & Submit <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 2 — Upload                                                     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="auth-card animate-slide-up">

            {/* ── idle: review summary ──────────────────────────────────────── */}
            {uploadStatus === 'idle' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Review before submitting</h3>
                </div>

                <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                  <SummaryRow icon={Building2} label="Industries"    value={clientIndustry.join(', ')} />
                  <SummaryRow icon={Tag}       label="Proposal Type" value={proposalType} />
                  <SummaryRow icon={Target}    label="Priorities"    value={clientPriorities.join(', ')} />
                  <SummaryRow icon={FileText}  label="File"          value={`${file?.name}  (${fileSizeMB} MB)`} />
                </div>

                <div className="flex justify-between pt-1">
                  <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <button onClick={handleUpload} className="btn-primary flex items-center gap-2 text-sm">
                    <Upload size={14} /> Upload & Analyse
                  </button>
                </div>
              </div>
            )}

            {/* ── uploading ────────────────────────────────────────────────── */}
            {uploadStatus === 'uploading' && (
              <div className="py-4 space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                  <LoadingSpinner size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white">Processing your proposal…</p>
                    <p className="text-xs text-gray-500">This takes a few seconds</p>
                  </div>
                </div>

                {/* Animated progress bar */}
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (uploadProgress.length / 4) * 100)}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="space-y-2.5 pt-1">
                  {uploadProgress.map((p, i) => (
                    <ProgressStep key={i} msg={p.msg} done={p.done} delay={i * 200} />
                  ))}
                </div>
              </div>
            )}

            {/* ── success ──────────────────────────────────────────────────── */}
            {uploadStatus === 'success' && (
              <div className="py-6 text-center animate-fade-in">
                <AnimatedCheck />

                <h2 className="text-lg font-bold text-white mt-4 mb-1">Upload successful!</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Your {pageCount}-page proposal is ready for AI analysis.
                </p>

                {/* Progress steps recap */}
                <div className="text-left bg-gray-950 rounded-xl border border-gray-800 px-4 py-3 space-y-2 mb-5">
                  {uploadProgress.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" fill="rgba(52,211,153,0.15)" stroke="rgba(52,211,153,0.4)" strokeWidth="1"/>
                        <path d="M3.5 6L5.5 8L8.5 4" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {p.msg}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate(`/results/${resultSessionId}`)}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Sparkles size={14} /> Start Analysis
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    Dashboard <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── error ────────────────────────────────────────────────────── */}
            {uploadStatus === 'error' && (
              <div className="py-6 text-center animate-fade-in space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-700 flex items-center justify-center mx-auto">
                  <AlertCircle size={28} className="text-red-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Upload failed</p>
                  <p className="text-sm text-red-400 mt-1 max-w-xs mx-auto leading-relaxed">{uploadError}</p>
                </div>
                <button
                  onClick={() => { setUploadStatus('idle'); setUploadProgress([]) }}
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <RotateCcw size={14} /> Try again
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Inline keyframe styles (success animation) ─────────────────────── */}
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
      `}</style>
    </div>
  )
}
