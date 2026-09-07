import { useStore } from '../store'

const NAV = [
  { v: 'home',      icon: '⌂',  label: 'Home' },
  { v: 'upload',    icon: '↑',  label: 'Upload Data' },
  { v: 'dashboard', icon: '◈',  label: 'Dashboard' },
  { v: 'eda',       icon: '∑',  label: 'EDA & Stats' },
  { v: 'report',    icon: '⊞',  label: 'Full Report' },
  { v: 'chat',      icon: '◎',  label: 'AI Chat' },
]

export default function Sidebar() {
  const { view, setView, activeSession, sessionHistory, setActiveSession, user, logout, reportStatus, theme } = useStore()
  const isLight = theme === 'light'

  return (
    <aside className={`w-56 min-w-[224px] flex flex-col h-full border-r ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-lg flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>D</div>
        <div>
          <div className={`text-base font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>DataMind</div>
          <div className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Enterprise</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => (
          <button key={item.v} onClick={() => setView(item.v)}
            className={`nav-item ${view === item.v ? 'active' : ''}`}>
            <span className="w-5 text-center text-base">{item.icon}</span>
            <span>{item.label}</span>
            {item.v === 'report' && reportStatus === 'done' && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </nav>

      {/* Recent datasets */}
      {sessionHistory.length > 0 && (
        <div className={`px-3 pb-2 border-t ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-widest pt-3 pb-2 px-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Recent</div>
          {sessionHistory.slice(0, 4).map(s => (
            <button key={s.session_id}
              onClick={() => { setActiveSession(s); setView('dashboard') }}
              className={`nav-item text-left w-full ${activeSession?.session_id === s.session_id ? 'active' : ''}`}>
              <span className="text-base flex-shrink-0">{s.brand?.icon || '📊'}</span>
              <div className="min-w-0">
                <div className={`text-xs font-semibold truncate ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                  {s.filename?.slice(0, 18)}{s.filename?.length > 18 ? '…' : ''}
                </div>
                <div className="text-[11px] text-gray-500">{(s.row_count || 0).toLocaleString()} rows</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* User */}
      <div className={`px-3 py-3 border-t ${isLight ? 'border-gray-200' : 'border-gray-800'} flex items-center gap-2`}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>{user.name[0]}</div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{user.name}</div>
          <div className="text-[11px] text-gray-500 truncate">{user.role}</div>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors text-base" title="Sign out">⏻</button>
      </div>
    </aside>
  )
}
