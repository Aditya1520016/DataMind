import { useState } from 'react'
import { useStore } from '../store'
import { streamSection, exportReportHTML } from '../utils/api'
import MDBlock from '../components/MDBlock'
import ChartRenderer from '../components/ChartRenderer'
import { CHART_COLORS, qualityColor } from '../utils/charts'
import toast from 'react-hot-toast'

const SECTIONS = [
  { key: 'executive',       num: '01', title: 'Executive Summary',          icon: '◈' },
  { key: 'kpis',            num: '02', title: 'KPI Analysis',                icon: '∑' },
  { key: 'trends',          num: '03', title: 'Trend & Pattern Analysis',    icon: '~' },
  { key: 'risks',           num: '04', title: 'Risk Assessment',             icon: '⚠' },
  { key: 'recommendations', num: '05', title: 'Strategic Recommendations',   icon: '→' },
  { key: 'forecast',        num: '06', title: 'Forecast & Outlook',          icon: '◎' },
]

export default function ReportPage() {
  const {
    activeSession, setView, report, setReport, reportStatus, setReportStatus,
    appendReportSection, setReportSection, setSectionStatus, reportSectionStatus,
    selectedModel, user, availableModels, setSelectedModel,
  } = useStore()

  const [generatingAll, setGeneratingAll] = useState(false)

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">⊞</div>
      <h3 className="text-xl font-black text-white mb-2">No Dataset Loaded</h3>
      <p className="text-gray-400 mb-6">Upload a dataset to generate an executive report</p>
      <button className="btn-primary" onClick={() => setView('upload')}>Upload Data →</button>
    </div>
  )

  const ds = activeSession
  const an = ds.analysis || {}

  // Generate single section with streaming
  const genSection = async (key) => {
    setSectionStatus(key, 'streaming')
    setReportSection(key, '')
    try {
      await streamSection(
        ds.session_id, key, selectedModel,
        (token) => appendReportSection(key, token),
        () => setSectionStatus(key, 'done')
      )
    } catch (err) {
      setSectionStatus(key, 'error')
      setReportSection(key, `**Error:** ${err.message}. Make sure Ollama is running (\`ollama serve\`) and model "${selectedModel}" is installed (\`ollama pull ${selectedModel}\`).`)
      toast.error(`Failed to generate ${key} section`)
    }
  }

  // Generate all sections sequentially
  const genAll = async () => {
    setGeneratingAll(true)
    setReportStatus('generating')
    setReport({})
    let allOk = true
    for (const sec of SECTIONS) {
      try {
        await genSection(sec.key)
      } catch { allOk = false }
      await new Promise(r => setTimeout(r, 200))
    }
    setReportStatus(allOk ? 'done' : 'error')
    setGeneratingAll(false)
    toast[allOk ? 'success' : 'error'](allOk ? '✓ Full report generated' : 'Report generated with some errors')
  }

  const hasAny = report && Object.keys(report).length > 0
  const allDone = SECTIONS.every(s => reportSectionStatus[s.key] === 'done')

  const handleExport = async () => {
    try {
      await exportReportHTML(ds.session_id, report, user.name, user.company)
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Actions bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white mb-1">Executive Intelligence Report</h2>
          <p className="text-gray-400 text-sm">
            AI-generated board-ready analysis · {ds.filename} · {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Model selector */}
          {availableModels.length > 0 && (
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="select text-sm">
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {hasAny && allDone && (
            <button onClick={handleExport} className="btn-secondary text-sm">🖨 Export PDF</button>
          )}
          <button onClick={genAll} disabled={generatingAll} className="btn-primary text-sm">
            {generatingAll ? <><span className="spin-s" />Generating…</> : hasAny ? '↺ Regenerate' : '⊞ Generate Full Report'}
          </button>
        </div>
      </div>

      {/* Model warning */}
      {availableModels.length === 0 && (
        <div className="card p-4 border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm">
          ⚠ No Ollama models found. Run <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">ollama serve</code> then{' '}
          <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-xs">ollama pull llama3.2</code> to install a model.
        </div>
      )}

      {/* Progress tracker */}
      {hasAny && (
        <div className="card p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Report Sections</div>
          <div className="grid grid-cols-3 gap-3">
            {SECTIONS.map(sec => {
              const status = reportSectionStatus[sec.key]
              const content = report?.[sec.key]
              return (
                <div key={sec.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${content ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${content ? 'bg-emerald-500/20 text-emerald-400' : status === 'streaming' ? 'bg-blue-500/15' : 'bg-gray-800 text-gray-500'}`}>
                    {content ? '✓' : status === 'streaming' ? <span className="spin-s" style={{ width: 10, height: 10, borderColor: 'rgba(255,255,255,.2)', borderTopColor: '#3B82F6' }} /> : '○'}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500">{sec.num}</div>
                    <div className={`text-xs font-semibold ${content ? 'text-emerald-400' : 'text-gray-400'}`}>{sec.title}</div>
                  </div>
                  {!generatingAll && status !== 'streaming' && (
                    <button onClick={() => genSection(sec.key)} className="ml-auto text-[11px] text-blue-400 hover:text-blue-300">
                      {content ? '↺' : '▶'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAny && !generatingAll && (
        <div className="card p-16 text-center border-dashed">
          <div className="text-5xl mb-4">⊞</div>
          <h3 className="text-xl font-black text-white mb-2">Generate Your Executive Report</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Click "Generate Full Report" to create a 6-section board-ready analysis powered by Ollama running locally on your machine.
          </p>
          <button onClick={genAll} disabled={generatingAll || availableModels.length === 0} className="btn-primary mx-auto">
            ⊞ Generate Full Report →
          </button>
        </div>
      )}

      {/* The Report Document */}
      {hasAny && (
        <div className="card overflow-hidden">
          {/* Cover */}
          <div className="p-10 border-b border-gray-800" style={{ background: 'linear-gradient(135deg,#07090F,#0D1A2E)' }}>
            <div className="flex justify-between items-start mb-8">
              <div className="text-sm font-bold text-blue-400 tracking-widest">◈ DataMind Enterprise</div>
              <div className="text-[10px] font-black tracking-[3px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-3 py-1 rounded">CONFIDENTIAL</div>
            </div>
            <div className="text-[11px] tracking-[4px] uppercase text-blue-400 font-bold mb-3">Intelligence Report</div>
            <h1 className="text-4xl font-black text-white mb-3 leading-tight">{ds.filename.replace(/\.(csv|xlsx?)$/i, '')}</h1>
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <span>{ds.brand?.icon} {ds.brand?.name}</span>
              <span className="text-gray-600">·</span>
              <span>{(ds.row_count || 0).toLocaleString()} Records</span>
              <span className="text-gray-600">·</span>
              <span>{(ds.headers || []).length} Dimensions</span>
              <span className="text-gray-600">·</span>
              <span style={{ color: qualityColor(an.quality_score || 0) }}>Quality {an.quality_score || 0}/100</span>
            </div>
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-800/80 text-sm text-gray-500">
              <span>Prepared for: {user.name} · {user.role}</span>
              <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Quality Banner */}
          <div className="px-10 py-5 border-b border-gray-800 bg-gray-900/50 flex items-center gap-10">
            <div className="text-center">
              <div className="text-5xl font-black leading-none mb-1" style={{ color: qualityColor(an.quality_score || 0) }}>{an.quality_score || 0}</div>
              <div className="text-xs text-gray-500">Quality Score /100</div>
            </div>
            {[['Records Analyzed',(ds.row_count||0).toLocaleString()],['Duplicates Removed',an.dupes||0],['Missing Filled',an.missing_cells||0],['Outliers Detected',an.outlier_cells||0]].map(([l,v]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black text-white mb-1">{v}</div>
                <div className="text-xs text-gray-500">{l}</div>
              </div>
            ))}
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${an.quality_score || 0}%`, background: `linear-gradient(90deg,${qualityColor(an.quality_score||0)},#3B82F6)` }} />
              </div>
            </div>
          </div>

          {/* Sections */}
          {SECTIONS.map(sec => (
            <div key={sec.key} className="px-10 py-8 border-b border-gray-800">
              <div className="flex items-center gap-4 mb-5">
                <span className="text-[11px] font-black tracking-[3px] text-blue-400 font-mono">{sec.num}</span>
                <span className="text-lg">{sec.icon}</span>
                <h2 className="text-xl font-black text-white">{sec.title}</h2>
                {reportSectionStatus[sec.key] === 'streaming' && (
                  <span className="flex items-center gap-2 text-xs text-blue-400 ml-2">
                    <span className="spin-s" />Generating…
                  </span>
                )}
                {!generatingAll && (
                  <button onClick={() => genSection(sec.key)} disabled={reportSectionStatus[sec.key] === 'streaming'}
                    className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    ↺ Regenerate
                  </button>
                )}
              </div>
              <div className="pl-11">
                {report?.[sec.key]
                  ? <MDBlock text={report[sec.key]} className={reportSectionStatus[sec.key] === 'streaming' ? 'streaming-cursor' : ''} />
                  : <p className="text-gray-600 italic text-sm">
                      {generatingAll ? 'Waiting…' : 'Click ▶ to generate this section'}
                    </p>
                }
              </div>
            </div>
          ))}

          {/* Visualizations */}
          {allDone && (
            <div className="px-10 py-8 border-b border-gray-800">
              <div className="flex items-center gap-4 mb-5">
                <span className="text-[11px] font-black tracking-[3px] text-blue-400 font-mono">07</span>
                <span className="text-lg">📊</span>
                <h2 className="text-xl font-black text-white">Data Visualizations</h2>
              </div>
              <div className="pl-11 grid grid-cols-3 gap-4">
                {buildReportCharts(ds).slice(0, 6).map((c, i) => (
                  <ChartRenderer key={i} chart={c} height={180} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-10 py-4 flex justify-between text-xs text-gray-600">
            <span>DataMind Enterprise · AI by Ollama ({selectedModel}) · {new Date().toLocaleDateString()}</span>
            <span>{user.name} · {user.company} · CONFIDENTIAL</span>
          </div>
        </div>
      )}
    </div>
  )
}

function buildReportCharts(ds) {
  const an = ds.analysis || {}
  const numCols = an.num_cols || []
  const catCols = an.cat_cols || []
  const stats = an.stats || {}
  const rows = ds.preview || []
  const charts = []
  let id = 0

  catCols.slice(0, 2).forEach(col => {
    const st = stats[col]
    if (!st?.top_values?.length) return
    charts.push({ id: id++, type: 'bar', title: `Distribution — ${col}`, rotateX: true,
      data: st.top_values.slice(0, 8).map(([n, v]) => ({ name: n.length > 12 ? n.slice(0, 12) + '…' : n, value: v })) })
  })

  numCols.slice(0, 2).forEach((col, i) => {
    charts.push({ id: id++, type: i === 0 ? 'line' : 'area', title: `Trend — ${col}`, color: CHART_COLORS[i + 2],
      data: rows.slice(0, 30).map((r, idx) => ({ x: idx + 1, y: parseFloat(r[col]) || 0 })) })
  })

  if (catCols.length > 0) {
    const col = catCols[catCols.length > 1 ? 1 : 0]
    const st = stats[col]
    if (st?.top_values?.length)
      charts.push({ id: id++, type: 'pie', title: `Breakdown — ${col}`,
        data: st.top_values.slice(0, 6).map(([n, v]) => ({ name: n.slice(0, 14), value: v })) })
  }

  if (numCols.length >= 3) {
    const cols = numCols.slice(0, 6)
    charts.push({ id: id++, type: 'radar', title: 'Dataset Profile',
      data: cols.map(c => { const st = stats[c] || {}; const rng = (st.max||0)-(st.min||0)||1; return { metric: c.slice(0,10), value: Math.round(((st.mean||0)-(st.min||0))/rng*100) } }) })
  }

  return charts
}
