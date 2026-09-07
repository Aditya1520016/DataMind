import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { streamChat } from '../utils/api'
import MDBlock from '../components/MDBlock'
import toast from 'react-hot-toast'

const SUGGESTIONS = {
  default: [
    'What is correlation analysis?', 'How do I detect outliers?',
    'Explain the IQR method', 'What makes a good data quality score?',
  ],
  data: (name) => [
    `Summarize "${name}" in 3 bullet points for a CEO`,
    'What are the top 3 business risks in this data?',
    'Which variables are most correlated?',
    'What immediate actions should management take?',
    'Are there any anomalies I should investigate?',
    'What does the data quality score tell us?',
  ],
}

export default function ChatPage() {
  const { activeSession, chat, addMessage, appendToLastMessage, clearChat, selectedModel, user, setView } = useStore()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const send = async () => {
    if (!input.trim() || streaming) return
    if (!activeSession) {
      toast('Upload a dataset first for data-specific answers', { icon: '💡' })
    }
    const userMsg = { role: 'user', content: input }
    addMessage(userMsg)
    setInput('')
    setStreaming(true)

    // Add empty assistant message to stream into
    addMessage({ role: 'assistant', content: '' })

    try {
      await streamChat(
        activeSession?.session_id || 'none',
        input,
        chat.slice(-8),
        selectedModel,
        (token) => appendToLastMessage(token),
        () => setStreaming(false),
      )
    } catch (err) {
      appendToLastMessage(`\n\n**Error:** ${err.message}\n\nMake sure Ollama is running: \`ollama serve\``)
      setStreaming(false)
    }
  }

  const suggs = activeSession
    ? SUGGESTIONS.data(activeSession.filename?.replace(/\.(csv|xlsx?)$/i, ''))
    : SUGGESTIONS.default

  return (
    <div className="flex justify-center h-full">
      <div className="w-full max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
        {/* Chat container */}
        <div className="card flex flex-col flex-1 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 bg-gray-900/50">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
            <div className="flex-1">
              <div className="text-sm font-bold text-white">DataMind AI · Ollama ({selectedModel})</div>
              <div className="text-xs text-gray-400">
                {activeSession
                  ? `Context: ${activeSession.filename} (${(activeSession.row_count || 0).toLocaleString()} rows)`
                  : 'No dataset loaded — ask general analysis questions'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!activeSession && (
                <button onClick={() => setView('upload')} className="btn-secondary text-xs py-1.5 px-3">Upload Data</button>
              )}
              {chat.length > 0 && (
                <button onClick={clearChat} className="btn-ghost text-xs">Clear</button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {chat.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-4 text-blue-400">◎</div>
                <h3 className="text-lg font-black text-white mb-2">Ask Me Anything About Your Data</h3>
                <p className="text-gray-400 text-sm mb-6">
                  {activeSession
                    ? `Full context of "${activeSession.filename}" is loaded. Ask any question.`
                    : 'Upload a dataset first for data-specific insights, or ask general analysis questions.'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggs.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 hover:border-blue-500/50 hover:text-blue-400 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((msg, i) => (
              <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${msg.role === 'user' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-violet-600'}`}>
                  {msg.role === 'user' ? user.name[0] : '◎'}
                </div>
                <div className={`max-w-[76%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-blue-500/15 border border-blue-500/25 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'
                } ${msg.role === 'assistant' && streaming && i === chat.length - 1 && !msg.content ? 'streaming-cursor' : ''}`}>
                  {msg.role === 'assistant'
                    ? <MDBlock text={msg.content || ''} />
                    : msg.content}
                  {msg.role === 'assistant' && streaming && i === chat.length - 1 && msg.content && (
                    <span className="streaming-cursor" />
                  )}
                  {msg.role === 'assistant' && streaming && i === chat.length - 1 && !msg.content && (
                    <span><span className="dot-1" /><span className="dot-2" /><span className="dot-3" /></span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50 flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={activeSession ? `Ask about ${activeSession.filename}…` : 'Ask a data analysis question…'}
              disabled={streaming}
              className="input flex-1"
            />
            <button onClick={send} disabled={streaming || !input.trim()} className="btn-primary flex-shrink-0">
              {streaming ? <span className="spin-s" /> : 'Send →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
