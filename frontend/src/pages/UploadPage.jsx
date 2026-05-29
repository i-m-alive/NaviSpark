import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadDocument } from '../api/client'
import Navbar from '../components/Navbar'
import LoadingSpinner from '../components/LoadingSpinner'
import { Upload, FileText, X, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'

const STEPS = ['Context', 'File', 'Upload']

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

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            i < current ? 'bg-green-900 text-green-300'
              : i === current ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-500'
          )}>
            {i < current ? <CheckCircle size={13} /> : <span className="w-4 text-center">{i + 1}</span>}
            {step}
          </div>
          {i < steps.length - 1 && (
            <div className={clsx('h-px w-6 mx-1', i < current ? 'bg-green-700' : 'bg-gray-800')} />
          )}
        </div>
      ))}
    </div>
  )
}

function ToggleChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-xs px-3 py-1.5 rounded-full border transition-colors',
        selected
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
      )}
    >
      {label}
    </button>
  )
}

export default function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState(0)
  const [clientIndustry, setClientIndustry] = useState([])
  const [proposalType, setProposalType] = useState('')
  const [clientPriorities, setClientPriorities] = useState([])
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const [uploadStatus, setUploadStatus] = useState('idle') // idle | uploading | success | error
  const [uploadProgress, setUploadProgress] = useState([])
  const [uploadError, setUploadError] = useState('')
  const [resultSessionId, setResultSessionId] = useState(null)

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const canProceedStep0 = clientIndustry.length > 0 && proposalType && clientPriorities.length > 0
  const canProceedStep1 = !!file

  const addProgress = (msg, status = 'done') => {
    setUploadProgress(prev => [...prev, { msg, status }])
  }

  const handleUpload = async () => {
    setUploadStatus('uploading')
    setUploadProgress([])
    setUploadError('')

    addProgress('Validating file...', 'pending')

    try {
      setUploadProgress([{ msg: 'Detecting file type...', status: 'done' }])
      await new Promise(r => setTimeout(r, 300))

      addProgress('Uploading to server...')
      await new Promise(r => setTimeout(r, 300))

      const data = await uploadDocument({
        file,
        clientIndustry,
        proposalType,
        clientPriorities,
      })

      addProgress(`Converted and stored (${data.page_count} pages)`)
      addProgress('Session created successfully')

      setResultSessionId(data.session_id)
      setUploadStatus('success')
    } catch (err) {
      setUploadError(err.message)
      setUploadStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-semibold text-white mb-6">New Proposal Review</h1>

        <StepIndicator steps={STEPS} current={step} />

        {/* Step 0: Context */}
        {step === 0 && (
          <div className="card space-y-5">
            <div>
              <label className="label">Client Industry <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map(opt => (
                  <ToggleChip
                    key={opt}
                    label={opt}
                    selected={clientIndustry.includes(opt)}
                    onClick={() => toggleItem(clientIndustry, setClientIndustry, opt)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label">Proposal Type <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {PROPOSAL_TYPE_OPTIONS.map(opt => (
                  <ToggleChip
                    key={opt}
                    label={opt}
                    selected={proposalType === opt}
                    onClick={() => setProposalType(proposalType === opt ? '' : opt)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label">Client Priorities <span className="text-red-500">*</span></label>
              <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <ToggleChip
                    key={opt}
                    label={opt}
                    selected={clientPriorities.includes(opt)}
                    onClick={() => toggleItem(clientPriorities, setClientPriorities, opt)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(1)}
                disabled={!canProceedStep0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Next: Upload File <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: File selection */}
        {step === 1 && (
          <div className="card space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragOver ? 'border-blue-500 bg-blue-950/30' : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-300 font-medium">Drop your file here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse</p>
              <p className="text-gray-600 text-xs mt-2">PDF · PPT · PPTX · Max 100 MB</p>
            </div>

            {file && (
              <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                <FileText size={18} className="text-blue-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-400">
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="btn-secondary flex items-center gap-2 text-sm">
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Review & Upload <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Upload */}
        {step === 2 && (
          <div className="card space-y-5">
            {uploadStatus === 'idle' && (
              <>
                <h3 className="text-sm font-medium text-gray-300">Review before uploading</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 w-28 flex-shrink-0">Industries</span>
                    <span className="text-gray-200">{clientIndustry.join(', ')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 w-28 flex-shrink-0">Proposal Type</span>
                    <span className="text-gray-200">{proposalType}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 w-28 flex-shrink-0">Priorities</span>
                    <span className="text-gray-200">{clientPriorities.join(', ')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 w-28 flex-shrink-0">File</span>
                    <span className="text-gray-200">{file?.name}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2 text-sm">
                    <ChevronLeft size={15} /> Back
                  </button>
                  <button onClick={handleUpload} className="btn-primary flex items-center gap-2 text-sm">
                    <Upload size={15} /> Start Upload
                  </button>
                </div>
              </>
            )}

            {uploadStatus === 'uploading' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <LoadingSpinner size="md" />
                  <span className="text-sm text-gray-300 font-medium">Processing your file...</span>
                </div>
                {uploadProgress.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                    {p.msg}
                  </div>
                ))}
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="text-center py-4 space-y-4">
                <CheckCircle size={40} className="mx-auto text-green-400" />
                <div>
                  <p className="text-white font-medium">Upload successful!</p>
                  <p className="text-gray-500 text-sm mt-1">Your proposal is ready for analysis</p>
                </div>
                <div className="space-y-2">
                  {uploadProgress.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                      <CheckCircle size={12} className="text-green-500" />
                      {p.msg}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => navigate(`/results/${resultSessionId}`)}
                    className="btn-primary text-sm"
                  >
                    View Session
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary text-sm"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="text-center py-4 space-y-4">
                <AlertCircle size={40} className="mx-auto text-red-400" />
                <div>
                  <p className="text-white font-medium">Upload failed</p>
                  <p className="text-red-400 text-sm mt-1">{uploadError}</p>
                </div>
                <button
                  onClick={() => { setUploadStatus('idle'); setUploadProgress([]) }}
                  className="btn-secondary text-sm"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
