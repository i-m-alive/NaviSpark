import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadRevision, startAnalysis, startCustomAnalysis } from '../../api/client'
import { clsx } from 'clsx'
import { Upload, FileText, X, ChevronUp, ChevronDown, Loader2, Sparkles, RefreshCw } from 'lucide-react'

export default function UploadRevisionPanel({ sessionId, versionNumber, parentFilename, reviewMode = 'standard' }) {
  const navigate         = useNavigate()
  const fileInputRef     = useRef(null)

  const [open,        setOpen]        = useState(false)
  const [file,        setFile]        = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [starting,    setStarting]    = useState(false)
  const [uploadedId,  setUploadedId]  = useState(null)
  const [uploadedVer, setUploadedVer] = useState(null)
  const [error,       setError]       = useState('')

  const nextVersion = (versionNumber || 1) + 1
  const fileSizeMB  = file ? (file.size / 1024 / 1024).toFixed(2) : null

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setError('') }
  }

  const handleUploadAndAnalyze = async () => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const data = await uploadRevision(sessionId, file)
      setUploadedId(data.session_id)
      setUploadedVer(data.version_number)
      setUploading(false)
      setStarting(true)

      const isCustom = reviewMode === 'custom' || data.review_mode === 'custom'
      if (isCustom) {
        await startCustomAnalysis(data.session_id)
        navigate(`/custom-results/${data.session_id}`)
      } else {
        await startAnalysis(data.session_id)
        navigate(`/results/${data.session_id}`)
      }
    } catch (err) {
      setError(err.message)
      setUploading(false)
      setStarting(false)
    }
  }

  const isLoading = uploading || starting

  return (
    <div className="mt-3 animate-fade-in">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
          open
            ? 'bg-blue-950/30 border-blue-800/60 text-blue-300'
            : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200',
        )}
      >
        <RefreshCw size={14} className={open ? 'text-blue-400' : ''} />
        <span>Upload Improved Version (V{nextVersion})</span>
        <span className="text-[10px] text-gray-600 ml-1">
          Address the suggestions, then re-analyze
        </span>
        <div className="ml-auto">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expandable panel */}
      {open && (
        <div
          className="mt-2 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
          style={{ animation: 'slide-up-fade 0.3s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Context banner */}
          <div className="flex items-start gap-2.5 bg-blue-950/30 border border-blue-900/50 rounded-xl px-4 py-3 text-xs">
            <Sparkles size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium mb-0.5">
                Submitting V{nextVersion} revision
              </p>
              <p className="text-blue-400/70">
                {reviewMode === 'custom'
                  ? 'The same checklist and detected context are inherited. Upload your improved PDF or PPTX and we\'ll re-evaluate it against the same custom checklist.'
                  : 'All previous context (industry, proposal type, priorities) is inherited. Upload your improved PDF or PPTX and we\'ll run the full 4-agent analysis again.'
                }
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && !isLoading && fileInputRef.current?.click()}
            className={clsx(
              'relative rounded-2xl p-6 text-center transition-all duration-200 overflow-hidden',
              isLoading ? 'cursor-not-allowed opacity-50' :
              dragOver   ? 'border-2 border-blue-500 bg-blue-950/20 cursor-pointer' :
              file       ? 'border-2 border-green-700/60 bg-green-950/10' :
                           'border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-800/20 cursor-pointer',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx"
              className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setError('') } }}
            />

            {file ? (
              <div className="space-y-2 animate-fade-in">
                <div className="w-11 h-11 rounded-xl bg-green-950 border border-green-800 flex items-center justify-center mx-auto">
                  <FileText size={18} className="text-green-400" />
                </div>
                <p className="text-sm font-semibold text-white truncate max-w-xs mx-auto">{file.name}</p>
                <p className="text-xs text-gray-500">{fileSizeMB} MB · {file.name.split('.').pop().toUpperCase()}</p>
                {!isLoading && (
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    <X size={10} /> Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className={clsx(
                  'w-11 h-11 rounded-xl flex items-center justify-center mx-auto transition-all',
                  dragOver ? 'bg-blue-900 border border-blue-700 scale-110' : 'bg-gray-800 border border-gray-700',
                )}>
                  <Upload size={18} className={dragOver ? 'text-blue-400' : 'text-gray-500'} />
                </div>
                <p className="text-sm font-semibold text-gray-200">
                  {dragOver ? 'Drop to upload revised proposal' : 'Drop your improved proposal here'}
                </p>
                <p className="text-xs text-gray-500">or click to browse · PDF · PPT · PPTX · Max 100 MB</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              <span>⚠</span>{error}
            </div>
          )}

          {/* Submit button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadAndAnalyze}
              disabled={!file || isLoading}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg transition-all relative overflow-hidden',
                file && !isLoading
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-800/50 border border-gray-700 cursor-not-allowed',
              )}
              style={file && !isLoading ? {
                background: 'linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.3)',
              } : {}}
            >
              {uploading ? (
                <><Loader2 size={14} className="animate-spin" /> Uploading V{nextVersion}…</>
              ) : starting ? (
                <><Loader2 size={14} className="animate-spin" /> Starting analysis…</>
              ) : (
                <><Sparkles size={14} /> Upload V{nextVersion} &amp; Analyze</>
              )}
            </button>
            <button
              onClick={() => { setOpen(false); setFile(null); setError('') }}
              disabled={isLoading}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 border border-gray-800 rounded-lg transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
