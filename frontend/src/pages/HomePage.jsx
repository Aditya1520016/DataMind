import { useStore } from '../store'
import { qualityColor } from '../utils/charts'

export default function HomePage() {
  const { activeSession, user, setView, reportStatus, chat, sessionHistory } = useStore()

  const stats = [
    { l: 'Datasets Loaded', v: sessionHistory.length, c: '#3B82F6', i: '◈' },
    { l: 'Active Rows', v: activeSession ? (activeSession.row_count || 0).toLocaleString() : '—', c: '#10B981', i: '◧' },
    { l: 'Data Quality', v: activeSession ? `${activeSession.analysis?.quality_score || 0}%` : '—', c: activeSession ? qualityColor(activeSession.analysis?.quality_score || 0) : '#6B7280', i: '◎' },
    { l: 'Report Status', v: reportStatus === 'done' ? 'Ready' : reportStatus === 'generating' ? 'Building…' : 'Not yet', c: reportStatus === 'done' ? '#10B981' : '#6B7280', i: '⊞' },
  ]

  const features = [
    { icon: '🧹', t: 'Auto Data Cleaning', d: 'Deduplication, missing value imputation, whitespace trimming with full audit log' },
    { icon: '📊', t: '10+ Chart Types', d: 'Bar, Line, Area, Pie, Scatter, Radar, Histogram, Box Plot, Forecast, Composed' },
    { icon: '🤖', t: 'Local AI via Ollama', d: 'Runs entirely on your machine — no data leaves your system. 100% private.' },
    { icon: '🔍', t: 'Full EDA Engine', d: 'Distribution, correlations, outlier detection, pivot tables, skewness analysis' },
    { icon: '💬', t: 'Streaming AI Chat', d: 'Ask any question — answers stream in real-time from your local Ollama model' },
    { icon: '🖨', t: 'PDF Export', d: 'Print-optimized HTML report opens browser print dialog for PDF save' },
    { icon: '📗', t: 'Excel Support', d: 'Native .xlsx and .xls parsing alongside CSV, with multi-sheet detection' },
    { icon: '📈', t: 'Linear Forecasting', d: 'Statistical trend projection with confidence intervals on any numeric column' },
    { icon: '🔄', t: 'Pivot Tables', d: 'Group-by analysis with 6 aggregation functions and live visualization' },
  ]

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="rounded-2xl p-9 border border-gray-800" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,.06),rgba(139,92,246,.06))' }}>
        <div className="text-sm font-bold text-blue-400 mb-2 tracking-wide">Welcome, {user.name.split(' ')[0]} 👋</div>
        <h2 className="text-4xl font-black text-white mb-3 leading-tight">
          Your Local AI<br />Data Intelligence Platform
        </h2>
        <p className="text-gray-400 text-base max-w-xl mb-7 leading-relaxed">
          Upload CSV or Excel files and receive complete board-ready analysis with AI insights powered by Ollama — running entirely on your machine, privately and securely.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button className="btn-primary text-base py-3 px-6" onClick={() => setView('upload')}>Upload Dataset →</button>
          {activeSession && (
            <button className="btn-secondary text-base py-3 px-6" onClick={() => setView('dashboard')}>Open Dashboard</button>
          )}
          {activeSession && (
            <button className="btn-secondary text-base py-3 px-6" onClick={() => setView('report')}>Generate Report</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.l} className="card p-5 hover:border-gray-700 transition-colors">
            <div className="text-2xl mb-2" style={{ color: s.c }}>{s.i}</div>
            <div className="text-2xl font-black text-white mb-1">{s.v}</div>
            <div className="text-xs text-gray-400">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Platform Capabilities</div>
        <div className="grid grid-cols-3 gap-3">
          {features.map(f => (
            <div key={f.t} className="card p-5 hover:border-gray-700 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="text-sm font-bold text-white mb-1.5">{f.t}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick start */}
      <div className="card p-6">
        <div className="text-sm font-bold text-white mb-4">⚡ Quick Start</div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { n: '1', t: 'Start Ollama', c: 'Run ollama serve in your terminal', code: 'ollama serve' },
            { n: '2', t: 'Pull a Model', c: 'Install a model (llama3.2 recommended)', code: 'ollama pull llama3.2' },
            { n: '3', t: 'Start Backend', c: 'Launch the FastAPI server', code: 'cd backend && uvicorn main:app --reload' },
            { n: '4', t: 'Upload Data', c: 'Drop any CSV or Excel file', code: 'Supports CSV, XLSX, XLS' },
          ].map(s => (
            <div key={s.n} className="bg-gray-800/50 rounded-xl p-4">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black flex items-center justify-center mb-3">{s.n}</div>
              <div className="text-sm font-bold text-white mb-1">{s.t}</div>
              <div className="text-xs text-gray-400 mb-2">{s.c}</div>
              <code className="text-[11px] text-blue-300 bg-gray-900 px-2 py-1 rounded font-mono block break-all">{s.code}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
