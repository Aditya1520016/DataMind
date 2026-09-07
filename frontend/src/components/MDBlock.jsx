import { useStore } from '../store'

export default function MDBlock({ text, className = '' }) {
  const theme = useStore(s => s.theme)

  if (!text) return <p className="text-gray-500 italic text-sm">No content.</p>

  const primary = theme === 'dark' ? '#60A5FA' : '#2563EB'
  const textColor = theme === 'dark' ? '#E8F0FE' : '#0A0F1E'

  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, `<code style="background:rgba(59,130,246,.15);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:12px">$1</code>`)
    .replace(/^#### (.+)$/gm, `<h5 style="color:${primary};margin:10px 0 5px;font-size:13px;font-weight:700">$1</h5>`)
    .replace(/^### (.+)$/gm, `<h4 style="color:${primary};margin:14px 0 7px;font-size:14px;font-weight:700">$1</h4>`)
    .replace(/^## (.+)$/gm, `<h3 style="color:${textColor};margin:18px 0 9px;font-size:16px;font-weight:800">$1</h3>`)
    .replace(/^# (.+)$/gm, `<h2 style="color:${textColor};margin:20px 0 10px;font-size:18px;font-weight:800">$1</h2>`)
    // Risk levels
    .replace(/^🔴 (.+)$/gm, `<div style="display:flex;gap:8px;padding:8px 12px;background:rgba(239,68,68,.1);border-left:3px solid #EF4444;border-radius:0 6px 6px 0;margin:5px 0"><span>🔴</span><span style="color:${textColor}">$1</span></div>`)
    .replace(/^🟡 (.+)$/gm, `<div style="display:flex;gap:8px;padding:8px 12px;background:rgba(245,158,11,.1);border-left:3px solid #F59E0B;border-radius:0 6px 6px 0;margin:5px 0"><span>🟡</span><span style="color:${textColor}">$1</span></div>`)
    .replace(/^🟢 (.+)$/gm, `<div style="display:flex;gap:8px;padding:8px 12px;background:rgba(16,185,129,.1);border-left:3px solid #10B981;border-radius:0 6px 6px 0;margin:5px 0"><span>🟢</span><span style="color:${textColor}">$1</span></div>`)
    // Scenarios
    .replace(/^📈 (.+)$/gm, `<div style="display:flex;gap:8px;padding:7px 12px;background:rgba(16,185,129,.08);border-radius:8px;margin:5px 0"><span>📈</span><span style="color:#10B981;font-weight:600">$1</span></div>`)
    .replace(/^📊 (.+)$/gm, `<div style="display:flex;gap:8px;padding:7px 12px;background:rgba(59,130,246,.08);border-radius:8px;margin:5px 0"><span>📊</span><span style="color:#60A5FA;font-weight:600">$1</span></div>`)
    .replace(/^📉 (.+)$/gm, `<div style="display:flex;gap:8px;padding:7px 12px;background:rgba(239,68,68,.08);border-radius:8px;margin:5px 0"><span>📉</span><span style="color:#EF4444;font-weight:600">$1</span></div>`)
    // Lists
    .replace(/^• (.+)$/gm, `<div style="display:flex;gap:9px;margin:6px 0;align-items:flex-start"><span style="color:${primary};margin-top:3px;flex-shrink:0;font-size:10px">▸</span><span style="color:${textColor};line-height:1.65">$1</span></div>`)
    .replace(/^- (.+)$/gm, `<div style="display:flex;gap:9px;margin:6px 0;align-items:flex-start"><span style="color:${primary};margin-top:3px;flex-shrink:0;font-size:10px">▸</span><span style="color:${textColor};line-height:1.65">$1</span></div>`)
    .replace(/^(\d+)\. (.+)$/gm, `<div style="display:flex;gap:9px;margin:6px 0"><span style="color:${primary};font-weight:700;min-width:18px;flex-shrink:0">$1.</span><span style="color:${textColor}">$2</span></div>`)
    .replace(/\n\n/g, '<div style="margin:8px 0"></div>')
    .replace(/\n/g, '<br/>')

  return (
    <div
      className={`text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ color: textColor }}
    />
  )
}
