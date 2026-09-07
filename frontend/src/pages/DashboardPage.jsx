import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { getRows } from '../utils/api'
import ChartRenderer from '../components/ChartRenderer'
import { CHART_COLORS, fmtNum, fmtPct, qualityColor, getBrandImages } from '../utils/charts'
import { useStore as useStoreRaw } from '../store'

export default function DashboardPage() {
  const { activeSession, setView } = useStore()
  const [tab, setTab] = useState('overview')

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">◈</div>
      <h3 className="text-xl font-black text-white mb-2">No Dataset Loaded</h3>
      <p className="text-gray-400 mb-6">Upload a CSV or Excel file to see your analytics dashboard</p>
      <button className="btn-primary" onClick={() => setView('upload')}>Upload Data →</button>
    </div>
  )

  const ds = activeSession
  const an = ds.analysis || {}
  const brand = ds.brand || {}
  const TABS = ['overview', 'charts', 'cleaning', 'data table']

  return (
    <div className="space-y-5">
      <BrandBanner ds={ds} />

      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { l: 'Records',     v: (an.row_count || ds.row_count || 0).toLocaleString(), c: '#3B82F6' },
          { l: 'Columns',     v: (ds.headers || []).length,                             c: '#06B6D4' },
          { l: 'Numeric',     v: (an.num_cols || []).length,                            c: '#8B5CF6' },
          { l: 'Categorical', v: (an.cat_cols || []).length,                            c: '#F59E0B' },
          { l: 'Quality',     v: `${an.quality_score || 0}%`,                           c: qualityColor(an.quality_score || 0) },
          { l: 'Outliers',    v: an.outlier_cells || 0,                                 c: (an.outlier_cells || 0) > 0 ? '#EF4444' : '#10B981' },
        ].map(k => (
          <div key={k.l} className="card p-4 hover:border-gray-700 transition-colors">
            <div className="text-2xl font-black mb-1" style={{ color: k.c }}>{k.v}</div>
            <div className="text-xs text-gray-400">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab-btn capitalize ${tab === t ? 'active' : ''}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview'   && <OverviewTab ds={ds} />}
      {tab === 'charts'     && <ChartsTab ds={ds} />}
      {tab === 'cleaning'   && <CleaningTab ds={ds} />}
      {tab === 'data table' && <DataTableTab ds={ds} />}
    </div>
  )
}

// ─── Brand Banner ────────────────────────────────────────────────
function BrandBanner({ ds }) {
  const brand = ds.brand || {}
  const imgs = getBrandImages(brand.name)
  const an = ds.analysis || {}

  return (
    <div className="card overflow-hidden">
      <div className="flex">
        <div className="flex-1 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${brand.color || '#3B82F6'}22`, border: `2px solid ${brand.color || '#3B82F6'}44` }}>
              {brand.icon || '📊'}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dataset Type</div>
              <div className="text-lg font-black text-white">{brand.name || 'General'}</div>
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-4">
            <span className="text-white font-bold">{(ds.row_count || 0).toLocaleString()}</span> records ·{' '}
            <span className="text-white font-bold">{(ds.headers || []).length}</span> dimensions ·{' '}
            Quality:{' '}
            <span className="font-bold" style={{ color: qualityColor(an.quality_score || 0) }}>
              {an.quality_score || 0}/100
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(ds.headers || []).slice(0, 6).map(h => (
              <span key={h} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: `${brand.color || '#3B82F6'}18`, color: brand.color || '#3B82F6' }}>{h}</span>
            ))}
            {(ds.headers || []).length > 6 && (
              <span className="text-xs text-gray-500">+{(ds.headers || []).length - 6} more</span>
            )}
          </div>
        </div>
        <div className="flex w-80 overflow-hidden rounded-r-xl">
          {imgs.slice(0, 3).map((src, i) => (
            <div key={i} className="flex-1 relative overflow-hidden">
              {i === 0 && <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to right, #111827, transparent)' }} />}
              <img src={src} alt="" className="w-full h-full object-cover"
                style={{ filter: 'brightness(.7) saturate(.9)', minHeight: 130 }}
                onError={e => e.target.style.display = 'none'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────
function OverviewTab({ ds }) {
  const charts = buildCharts(ds)
  return (
    <div className="grid grid-cols-3 gap-4">
      {charts.slice(0, 6).map((c, i) => <ChartRenderer key={i} chart={c} height={200} />)}
    </div>
  )
}

// ─── Charts Tab ─────────────────────────────────────────────────
function ChartsTab({ ds }) {
  const charts = buildCharts(ds)
  return (
    <div className="grid grid-cols-2 gap-4">
      {charts.map((c, i) => <ChartRenderer key={i} chart={c} height={240} />)}
    </div>
  )
}

// ─── Cleaning Tab ────────────────────────────────────────────────
function CleaningTab({ ds }) {
  const an = ds.analysis || {}
  const log = ds.clean_log || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { l: 'Original Rows',   v: (ds.original_row_count || 0).toLocaleString(), c: 'text-white' },
          { l: 'Cleaned Rows',    v: (ds.row_count || 0).toLocaleString(),           c: 'text-emerald-400' },
          { l: 'Dupes Removed',   v: an.dupes || 0,                                  c: (an.dupes || 0) > 0 ? 'text-red-400' : 'text-emerald-400' },
          { l: 'Missing Filled',  v: an.missing_cells || 0,                          c: 'text-amber-400' },
        ].map(k => (
          <div key={k.l} className="card p-4">
            <div className={`text-2xl font-black mb-1 ${k.c}`}>{k.v}</div>
            <div className="text-xs text-gray-400">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="text-sm font-bold text-white mb-4">Cleaning Log</div>
        {log.length === 0
          ? <p className="text-gray-500 text-sm">No cleaning actions needed — data was already clean.</p>
          : log.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
              <span className="text-sm text-gray-200 flex-1">{e.action}</span>
              <span className="text-xs font-mono text-gray-400">{(e.count || 0).toLocaleString()} cells</span>
            </div>
          ))
        }
      </div>

      <div className="card p-5">
        <div className="text-sm font-bold text-white mb-4">Missing Values by Column</div>
        <div className="space-y-2">
          {(ds.headers || []).map(col => {
            const st = an.stats?.[col] || {}
            const orig = ds.original_row_count || ds.row_count || 1
            const pct = ((st.missing || 0) / orig * 100)
            const barColor = pct > 20 ? '#EF4444' : pct > 5 ? '#F59E0B' : '#10B981'
            return (
              <div key={col} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-32 truncate flex-shrink-0">{col}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, .2)}%`, background: barColor }} />
                </div>
                <span className="text-xs font-mono text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                <span className="text-xs font-mono text-gray-600 w-8 text-right">{st.missing || 0}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Data Table Tab ──────────────────────────────────────────────
function DataTableTab({ ds }) {
  const { activeSession } = useStore()
  const [rows, setRows] = useState(ds.preview || [])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(ds.row_count || 0)
  const [loading, setLoading] = useState(false)
  const PAGE_SIZE = 50

  const loadPage = async (p) => {
    if (!activeSession) return
    setLoading(true)
    try {
      const data = await getRows(activeSession.session_id, p, PAGE_SIZE)
      setRows(data.rows)
      setTotal(data.total)
      setPage(p)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadPage(0) }, [activeSession?.session_id])

  const pages = Math.ceil(total / PAGE_SIZE)
  const headers = ds.headers || []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} rows
        </span>
        <div className="flex gap-2 items-center">
          <button onClick={() => loadPage(Math.max(0, page - 1))} disabled={page === 0 || loading} className="btn-secondary text-xs py-1.5 px-3">← Prev</button>
          <span className="text-xs text-gray-400 px-2">Page {page + 1} / {pages}</span>
          <button onClick={() => loadPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1 || loading} className="btn-secondary text-xs py-1.5 px-3">Next →</button>
        </div>
      </div>

      <div className="card overflow-auto" style={{ maxHeight: '65vh' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full spin" />
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr>{headers.map(h => <th key={h} className="table-head-cell">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                  {headers.map(h => <td key={h} className="table-cell max-w-[160px]">{row[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Auto Chart Builder ──────────────────────────────────────────
function buildCharts(ds) {
  const an = ds.analysis || {}
  const numCols = an.num_cols || []
  const catCols = an.cat_cols || []
  const stats = an.stats || {}
  const rows = ds.preview || []
  const charts = []
  let id = 0

  catCols.slice(0, 3).forEach(col => {
    const st = stats[col]
    if (!st?.top_values?.length) return
    charts.push({
      id: id++, type: 'bar', title: `Distribution — ${col}`, rotateX: true,
      data: st.top_values.slice(0, 8).map(([n, v]) => ({ name: n.length > 14 ? n.slice(0, 14) + '…' : n, value: v }))
    })
  })

  numCols.slice(0, 2).forEach((col, i) => {
    const data = rows.slice(0, 40).map((r, idx) => ({ x: idx + 1, y: parseFloat(r[col]) || 0 }))
    charts.push({ id: id++, type: i === 0 ? 'line' : 'area', title: `Trend — ${col}`, color: CHART_COLORS[i + 2], data })
  })

  if (catCols.length > 0) {
    const col = catCols[catCols.length > 1 ? 1 : 0]
    const st = stats[col]
    if (st?.top_values?.length) {
      charts.push({ id: id++, type: 'pie', title: `Breakdown — ${col}`,
        data: st.top_values.slice(0, 6).map(([n, v]) => ({ name: n.length > 14 ? n.slice(0, 14) + '…' : n, value: v })) })
    }
  }

  if (numCols.length >= 2) {
    const [c1, c2] = numCols
    charts.push({ id: id++, type: 'scatter', title: `${c1} vs ${c2}`, color: CHART_COLORS[3], xLabel: c1, yLabel: c2,
      data: rows.slice(0, 80).map(r => ({ x: parseFloat(r[c1]) || 0, y: parseFloat(r[c2]) || 0 })) })
  }

  if (numCols.length >= 3) {
    const cols = numCols.slice(0, 6)
    charts.push({ id: id++, type: 'radar', title: 'Dataset Profile',
      data: cols.map(c => {
        const st = stats[c] || {}
        const rng = (st.max || 0) - (st.min || 0) || 1
        return { metric: c.slice(0, 10), value: Math.round(((st.mean || 0) - (st.min || 0)) / rng * 100) }
      })
    })
  }

  if (numCols.length >= 2 && catCols.length === 0) {
    const [c1, c2] = numCols
    charts.push({ id: id++, type: 'composed', title: `${c1} + ${c2}`,
      data: rows.slice(0, 20).map((r, i) => ({ x: i + 1, bar: parseFloat(r[c1]) || 0, line: parseFloat(r[c2]) || 0 })) })
  }

  return charts
}
