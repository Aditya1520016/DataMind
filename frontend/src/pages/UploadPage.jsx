import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useStore } from '../store'
import { uploadFile } from '../utils/api'
import toast from 'react-hot-toast'

const STEPS = [
  'Reading file…', 'Parsing structure…', 'Detecting column types…',
  'Computing statistics…', 'Calculating correlations…',
  'Cleaning data…', 'Detecting brand…', 'Finalizing…',
]

export default function UploadPage() {
  const { setActiveSession, addToHistory, setView } = useStore()
  const [uploading, setUploading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [uploadPct, setUploadPct] = useState(0)
  const [processPct, setProcessPct] = useState(0)
  const [preview, setPreview] = useState(null)

  const process = useCallback(async (file) => {
    if (!file || uploading) return
    setUploading(true)
    setStepIdx(0)
    setProcessPct(0)

    // Simulate step progression while server processes
    const stepTimer = setInterval(() => {
      setStepIdx(i => { if (i < STEPS.length - 1) { setProcessPct(Math.round((i + 1) / STEPS.length * 90)); return i + 1 } return i })
    }, 350)

    try {
      const data = await uploadFile(file, pct => setUploadPct(pct))
      clearInterval(stepTimer)
      setProcessPct(100)

      // Show preview briefly then navigate
      setPreview({
        headers: data.headers,
        rows: data.preview?.slice(0, 5) || [],
        total: data.row_count,
        filename: data.filename,
      })

      setActiveSession(data)
      addToHistory(data)
      toast.success(`✓ "${file.name}" loaded — ${data.row_count.toLocaleString()} rows ready`)

      setTimeout(() => setView('dashboard'), 1200)
    } catch (err) {
      clearInterval(stepTimer)
      const msg = err?.response?.data?.detail || err.message || 'Upload failed'
      toast.error(`✗ ${msg}`)
    } finally {
      setUploading(false)
    }
  }, [uploading])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => files[0] && process(files[0]),
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false, disabled: uploading,
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Data Ingestion</h2>
        <p className="text-gray-400 text-sm">Upload CSV or Excel files. Auto-detection, cleaning, and analysis runs instantly on your backend.</p>
      </div>

      {/* Drop zone */}
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 flex items-center justify-center transition-all duration-200 cursor-pointer
          ${isDragActive ? 'border-blue-400 bg-blue-500/5' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}
          ${uploading ? 'cursor-default' : ''}`}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-center w-full max-w-xs">
            <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-blue-500 spin mx-auto mb-4" />
            <div className="text-blue-400 font-bold text-base mb-3">{STEPS[stepIdx]}</div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="h-full progress-shimmer rounded-full transition-all duration-500"
                style={{ width: `${processPct}%` }} />
            </div>
            <div className="text-gray-500 text-xs font-mono">{processPct}%</div>
          </div>
        ) : (
          <div className="text-center">
            <div className={`text-5xl mb-4 transition-transform ${isDragActive ? 'scale-125' : ''}`}>
              {isDragActive ? '📂' : '⬆'}
            </div>
            <div className="text-white font-bold text-lg mb-2">
              {isDragActive ? 'Release to upload' : 'Drop your file here'}
            </div>
            <div className="text-gray-400 text-sm mb-5">or click to browse · CSV, XLSX, XLS · Max 100MB</div>
            <button className="btn-primary mx-auto pointer-events-none">Choose File</button>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && !uploading && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <span className="text-sm font-bold text-white">📋 {preview.filename}</span>
            <span className="text-xs text-gray-400">{preview.total.toLocaleString()} rows · {preview.headers.length} columns</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>{preview.headers.slice(0, 8).map(h => <th key={h} className="table-head-cell">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                    {preview.headers.slice(0, 8).map(h => (
                      <td key={h} className="table-cell max-w-[140px] overflow-hidden text-ellipsis">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-800">Redirecting to Dashboard…</div>
        </div>
      )}

      {/* Supported formats info */}
      <div className="card p-5">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Supported Formats & Auto-Detection</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '📄', label: 'CSV', desc: 'All delimiters · UTF-8 / Latin-1' },
            { icon: '📗', label: 'Excel (.xlsx)', desc: 'Multi-sheet · openpyxl' },
            { icon: '📘', label: 'Excel (.xls)', desc: 'Legacy format · xlrd' },
          ].map(f => (
            <div key={f.label} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-sm font-bold text-white">{f.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Auto-detected Dataset Types</div>
          <div className="flex flex-wrap gap-2">
            {['🎬 Netflix', '🎵 Spotify', '📦 Amazon', '🏠 Airbnb', '📈 Finance', '🏥 Healthcare', '👥 HR', '💰 Sales', '🌐 Web Analytics', '🚗 Uber', '🐦 Twitter'].map(t => (
              <span key={t} className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-semibold">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
