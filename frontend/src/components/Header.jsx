import { useStore } from '../store'
import { exportCSV, exportExcel, exportReportHTML } from '../utils/api'
import toast from 'react-hot-toast'

const TITLES = {
  home: 'Intelligence Hub', upload: 'Data Ingestion',
  dashboard: 'Analytics Dashboard', eda: 'Exploratory Data Analysis',
  report: 'Executive Report', chat: 'AI Analyst Chat',
}

export default function Header() {
  const { view, setView, activeSession, theme, toggleTheme, report, reportStatus, user } = useStore()
  const isLight = theme === 'light'

  const handleExportReport = async () => {
    if (!report || !activeSession) return
    try {
      await exportReportHTML(activeSession.session_id, report, user.name, user.company)
    } catch { toast.error('Export failed') }
  }

  return (
    <header className={`flex items-center justify-between px-6 py-3 border-b ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} min-h-[56px]`}>
      <div>
        <h1 className={`text-base font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>{TITLES[view]}</h1>
        {activeSession && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="badge badge-blue text-[11px]">
              {activeSession.brand?.icon} {activeSession.brand?.name}
            </span>
            <span className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
              {activeSession.filename} · {(activeSession.row_count || 0).toLocaleString()} rows
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Export buttons when dashboard is active */}
        {activeSession && view === 'dashboard' && (
          <>
            <button onClick={() => exportCSV(activeSession.session_id)} className="btn-secondary text-xs py-2">
              ↓ CSV
            </button>
            <button onClick={() => exportExcel(activeSession.session_id)} className="btn-secondary text-xs py-2">
              ↓ Excel
            </button>
          </>
        )}

        {/* Export report PDF when report is done */}
        {view === 'report' && reportStatus === 'done' && report && (
          <button onClick={handleExportReport} className="btn-secondary text-xs py-2">
            🖨 Export PDF
          </button>
        )}

        {/* Generate report button */}
        {activeSession && view === 'dashboard' && (
          <button onClick={() => setView('report')}
            className="btn-primary text-sm py-2">
            ⊞ Full Report
          </button>
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          {isLight ? '☾' : '☀'}
        </button>

        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
          {user.name[0]}
        </div>
      </div>
    </header>
  )
}
