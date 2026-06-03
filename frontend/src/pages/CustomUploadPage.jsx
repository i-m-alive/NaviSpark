import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Upload, FileText, CheckSquare, Loader2, AlertCircle,
  CheckCircle2, ArrowRight, X, RefreshCw, Sparkles
} from 'lucide-react'
import Navbar from '../components/Navbar'
import ChecklistPreview from '../components/custom/ChecklistPreview'
import ContextConfirmPanel from '../components/custom/ContextConfirmPanel'
import { customUpload, getPreflightStatus, patchNc1Context, runCustomAnalysis, getSession } from '../api/client'

const ACCEPTED_PROPOSALS  = '.pdf,.pptx,.ppt'
const ACCEPTED_CHECKLISTS = '.xlsx,.xlsm,.csv,.docx,.pdf'

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }) {
  const steps = [
    { n: 1, label: 'Upload files' },
    { n: 2, label: 'Pre-flight' },
    { n: 3, label: 'Confirm context' },
    { n: 4, label: 'Evaluate' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            current === s.n ? 'bg-blue-900 text-blue-200 border border-blue-700'
            : current > s.n  ? 'text-green-400'
            : 'text-gray-600'
          )}>
            {current > s.n
              ? <CheckCircle2 size={12} className="text-green-400" />
              : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] border-current">{s.n}</span>
            }
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={clsx('w-6 h-px mx-1', current > s.n ? 'bg-green-700' : 'bg-gray-800')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ label, accept, file, onFile, icon: Icon, color = 'blue', description }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const colors = {
    blue: { border: 'border-blue-700', bg: 'bg-blue-950/30', text: 'text-blue-300', icon: 'text-blue-400' },
    teal: { border: 'border-teal-700', bg: 'bg-teal-950/30', text: 'text-teal-300', icon: 'text-teal-400' },
  }
  const c = colors[color]

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          dragging ? `${c.border} ${c.bg}` : file ? 'border-green-700 bg-green-950/20' : 'border-gray-700 hover:border-gray-500 bg-gray-900/40',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-sm text-green-300 truncate max-w-xs">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onFile(null) }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Icon size={24} className={clsx('mx-auto', c.icon)} />
            <p className={clsx('text-sm font-medium', c.text)}>Drop here or click to browse</p>
            {description && <p className="text-xs text-gray-600">{description}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomUploadPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [proposalFile, setProposalFile] = useState(null)
  const [checklistFile, setChecklistFile] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [preflightData, setPreflightData] = useState(null)
  const [nc1Overrides, setNc1Overrides] = useState({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  // Step 2: poll until status='ready' (preflight done) or 'pipeline_failed'
  useEffect(() => {
    if (step !== 2 || !sessionId) return
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const data = await getPreflightStatus(sessionId)
        if (data.status === 'ready') {
          stopPolling()
          setPreflightData(data)
          setStep(3)
        } else if (data.status === 'pipeline_failed') {
          stopPolling()
          setError('Pre-flight analysis failed. Please try again.')
          setStep(1)
        }
        // 'uploading' = NC1+NC2 still running — keep polling
      } catch (err) {
        stopPolling()
        setError(err.message)
      }
    }, 2500)
    return stopPolling
  }, [step, sessionId])

  const handleUpload = async () => {
    if (!proposalFile || !checklistFile) {
      setError('Please select both a proposal file and a checklist file.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const result = await customUpload({ proposalFile, checklistFile })
      setSessionId(result.session_id)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleStartEvaluation = async () => {
    setError('')
    setStep(4)
    try {
      // Save any user-edited NC1 overrides
      if (Object.keys(nc1Overrides).length > 0) {
        await patchNc1Context(sessionId, nc1Overrides)
      }
      await runCustomAnalysis(sessionId)
      navigate(`/custom-results/${sessionId}`)
    } catch (err) {
      setError(err.message || 'Failed to start evaluation.')
      setStep(3)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="mb-8" style={{ animation: 'slide-up-fade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={20} className="text-teal-400" />
            <h1 className="text-xl font-bold text-white">Custom Checklist Review</h1>
          </div>
          <p className="text-sm text-gray-400">
            Upload any proposal and your own evaluation checklist — get a scored verdict with evidence.
          </p>
        </div>

        <Steps current={step} />

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-4 mb-6 bg-red-950/40 border border-red-800/50 rounded-xl">
            <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ── Step 1: File selection ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6" style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
            <DropZone
              label="Proposal document"
              accept={ACCEPTED_PROPOSALS}
              file={proposalFile}
              onFile={setProposalFile}
              icon={FileText}
              color="blue"
              description="PDF or PowerPoint (.pdf, .pptx)"
            />
            <DropZone
              label="Evaluation checklist"
              accept={ACCEPTED_CHECKLISTS}
              file={checklistFile}
              onFile={setChecklistFile}
              icon={CheckSquare}
              color="teal"
              description="Excel, CSV, Word, or PDF (.xlsx, .csv, .docx, .pdf)"
            />

            <button
              onClick={handleUpload}
              disabled={!proposalFile || !checklistFile || uploading}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all',
                proposalFile && checklistFile && !uploading
                  ? 'bg-gradient-to-r from-blue-700 to-teal-700 hover:from-blue-600 hover:to-teal-600 text-white'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              )}
            >
              {uploading ? (
                <><Loader2 size={15} className="animate-spin" /> Uploading…</>
              ) : (
                <><Upload size={15} /> Upload &amp; Start Analysis</>
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Pre-flight running ───────────────────────────────────── */}
        {step === 2 && (
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4"
            style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div className="relative mx-auto w-16 h-16">
              <Loader2 size={64} className="text-blue-500 animate-spin opacity-20 absolute inset-0" />
              <Sparkles size={28} className="text-blue-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Analysing your files…</p>
              <p className="text-sm text-gray-400 mt-1">
                NC1 is reading your proposal &amp; NC2 is parsing your checklist in parallel.
                This takes about 20 seconds.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-2 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                NC1 — Document Intelligence: detecting context, structure, metadata
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                NC2 — Checklist Intelligence: parsing criteria and building evaluation framework
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Context confirmation ─────────────────────────────────── */}
        {step === 3 && preflightData && (
          <div className="space-y-5" style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="flex items-start gap-2 p-4 bg-blue-950/30 border border-blue-800/50 rounded-xl">
              <CheckCircle2 size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                Pre-flight complete! Review the detected context below and make any corrections
                before the evaluation starts.
              </p>
            </div>

            <ContextConfirmPanel
              nc1Summary={preflightData.nc1_summary}
              onOverridesChange={setNc1Overrides}
            />

            <ChecklistPreview nc2Summary={preflightData.nc2_summary} />

            <button
              onClick={handleStartEvaluation}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-teal-700 to-blue-700 hover:from-teal-600 hover:to-blue-600 text-white transition-all"
            >
              <ArrowRight size={15} />
              Start Evaluation (NC3 + NC4)
            </button>
          </div>
        )}

        {/* ── Step 4: Launching evaluation ─────────────────────────────────── */}
        {step === 4 && (
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-3"
            style={{ animation: 'slide-up-fade 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <Loader2 size={40} className="text-teal-400 animate-spin mx-auto" />
            <p className="text-base font-semibold text-white">Launching custom evaluation…</p>
            <p className="text-sm text-gray-400">
              NC3 is about to fan out across all checklist categories. Redirecting to results…
            </p>
          </div>
        )}

      </main>
    </div>
  )
}
