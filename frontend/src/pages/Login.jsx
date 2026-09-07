import { useState } from 'react'
import { useStore } from '../store'
import { checkHealth } from '../utils/api'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, theme } = useStore()
  const [loading, setLoading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const health = await checkHealth()
      setOllamaStatus(health.ollama)
      if (!health.ollama.connected) {
        toast('⚠ Ollama not detected — AI features need `ollama serve`', { icon: '⚠️' })
      }
    } catch { /* backend may not be running yet */ }
    await new Promise(r => setTimeout(r, 600))
    login()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#07090F]">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(59,130,246,.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,.10) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="card p-10 shadow-2xl" style={{ boxShadow: '0 32px 64px rgba(59,130,246,.1)' }}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl font-black"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>D</div>
            <div>
              <div className="text-xl font-black text-white">DataMind</div>
              <div className="text-[10px] font-bold text-blue-400 tracking-[2px] uppercase">Enterprise v3</div>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-7">AI-powered data analysis · Runs locally with Ollama</p>

          <div className="space-y-4 mb-6">
            {[['Email','aditya774tripathi@gmail.com','email'],['Password','••••••••','password']].map(([label, val, type]) => (
              <div key={label}>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>
                <input type={type} defaultValue={val} className="input" />
              </div>
            ))}
          </div>

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full justify-center text-base py-3 mb-5">
            {loading ? <><span className="spin-s" />Connecting…</> : 'Sign In →'}
          </button>

          <p className="text-center text-xs text-gray-500 mb-4">Demo credentials pre-filled · Click Sign In to continue</p>

          {/* Ollama Status */}
          {ollamaStatus && (
            <div className={`p-3 rounded-lg text-xs ${ollamaStatus.connected ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
              {ollamaStatus.connected
                ? `✓ Ollama connected · ${ollamaStatus.models.length} model(s) available`
                : '⚠ Ollama not running · Start with: ollama serve'
              }
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {['✓ CSV & Excel Support','✓ Local AI (Ollama)','✓ Board Reports','✓ Export PDF'].map(f => (
              <span key={f} className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
