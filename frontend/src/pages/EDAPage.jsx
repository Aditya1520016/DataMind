import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store'
import { getCorrelations, getOutliers, getPivot, getForecast } from '../utils/api'
import ChartRenderer from '../components/ChartRenderer'
import { fmtNum, fmtPct, severityColor, CHART_COLORS } from '../utils/charts'
import toast from 'react-hot-toast'

const TABS = ['distributions', 'correlations', 'outliers', 'pivot table', 'forecast']

export default function EDAPage() {
  const { activeSession, setView } = useStore()
  const [tab, setTab] = useState('distributions')

  if (!activeSession) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">∑</div>
      <h3 className="text-xl font-black text-white mb-2">No Dataset Loaded</h3>
      <p className="text-gray-400 mb-6">Upload a dataset to perform exploratory data analysis</p>
      <button className="btn-primary" onClick={() => setView('upload')}>Upload Data →</button>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white mb-1">Exploratory Data Analysis</h2>
        <p className="text-gray-400 text-sm">Deep statistical analysis of {activeSession.filename}</p>
      </div>
      <div className="flex gap-1.5 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab-btn capitalize ${tab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>
      {tab === 'distributions' && <DistTab ds={activeSession} />}
      {tab === 'correlations'  && <CorrTab sid={activeSession.session_id} ds={activeSession} />}
      {tab === 'outliers'      && <OutlierTab sid={activeSession.session_id} ds={activeSession} />}
      {tab === 'pivot table'   && <PivotTab sid={activeSession.session_id} ds={activeSession} />}
      {tab === 'forecast'      && <ForecastTab sid={activeSession.session_id} ds={activeSession} />}
    </div>
  )
}

// ─── Distributions ───────────────────────────────────────────────
function DistTab({ ds }) {
  const an = ds.analysis || {}
  const stats = an.stats || {}
  const numCols = an.num_cols || []
  const catCols = an.cat_cols || []

  return (
    <div className="space-y-5">
      {numCols.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 text-sm font-bold text-white">
            Numeric Statistics — {numCols.length} columns
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>{['Column','Count','Missing','Mean','Median','Std','Min','Q1','Q3','Max','Outlier%','Skew','CV'].map(h => (
                  <th key={h} className="table-head-cell">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {numCols.map((col, i) => {
                  const st = stats[col] || {}
                  return (
                    <tr key={col} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                      <td className="table-cell font-bold text-blue-400">{col}</td>
                      {[st.count, st.missing, st.mean, st.median, st.std, st.min, st.q1, st.q3, st.max].map((v, j) => (
                        <td key={j} className="table-cell">{fmtNum(v)}</td>
                      ))}
                      <td className={`table-cell font-bold ${(st.outlier_pct || 0) > 5 ? 'text-red-400' : 'text-gray-400'}`}>
                        {fmtPct(st.outlier_pct)}
                      </td>
                      <td className={`table-cell ${Math.abs(st.skewness || 0) > 0.5 ? 'text-amber-400' : 'text-gray-400'}`}>
                        {(st.skewness || 0).toFixed(3)}
                      </td>
                      <td className="table-cell text-gray-400">{fmtPct((st.cv || 0) * 100)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histograms */}
      {numCols.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {numCols.slice(0, 6).map((col, i) => {
            const st = stats[col] || {}
            const hist = st.histogram || []
            return (
              <div key={col}>
                <ChartRenderer
                  chart={{ id: i, type: 'histogram', title: `Histogram — ${col}`, color: CHART_COLORS[i % CHART_COLORS.length], data: hist }}
                  height={160}
                />
                <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-1">
                  <span>μ={fmtNum(st.mean)}</span><span>σ={fmtNum(st.std)}</span>
                  <span className={(st.skewness || 0) > 0.5 ? 'text-amber-400' : ''}>skew={st.skewness || 0}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Categorical */}
      {catCols.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-bold text-white mb-4">Categorical Columns</div>
          <div className="grid grid-cols-3 gap-4">
            {catCols.map(col => {
              const st = stats[col] || {}
              return (
                <div key={col} className="bg-gray-800/50 rounded-xl p-4">
                  <div className="text-sm font-bold text-blue-400 mb-1">{col}</div>
                  <div className="text-xs text-gray-500 mb-3">
                    {st.unique} unique · {st.missing} missing · mode: "{st.mode}"
                  </div>
                  {(st.top_values || []).slice(0, 6).map(([v, c]) => {
                    const pct = (c / (st.count || 1)) * 100
                    return (
                      <div key={v} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-gray-400 w-20 truncate">{v}</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
                        </div>
                        <span className="text-[11px] text-gray-500 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Correlations ────────────────────────────────────────────────
function CorrTab({ sid, ds }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCorrelations(sid).then(setData).catch(() => toast.error('Failed to load correlations')).finally(() => setLoading(false))
  }, [sid])

  if (loading) return <Spinner />
  if (!data || (data.num_cols || []).length < 2) return (
    <div className="card p-6 text-gray-400 text-sm">Need at least 2 numeric columns for correlation analysis.</div>
  )

  const cols = data.num_cols.slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 text-sm font-bold text-white">
          Pearson Correlation Matrix — {cols.length}×{cols.length}
        </div>
        <div className="p-4 text-xs text-gray-400 mb-2">
          Values: -1.0 (perfect negative) to +1.0 (perfect positive). Green = positive, Red = negative correlation.
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="w-28" />
                {cols.map(c => <th key={c} className="text-xs font-bold text-gray-400 px-2 py-1 text-center max-w-[80px] truncate">{c.slice(0, 10)}</th>)}
              </tr>
            </thead>
            <tbody>
              {cols.map(row => (
                <tr key={row}>
                  <td className="text-xs font-bold text-blue-400 pr-3 whitespace-nowrap">{row.slice(0, 12)}</td>
                  {cols.map(col => {
                    const v = data.matrix[row]?.[col] ?? 0
                    const abs = Math.abs(v)
                    const bg = v >= 0
                      ? `rgba(16,185,129,${abs === 1 ? .7 : abs * .65})`
                      : `rgba(239,68,68,${abs * .65})`
                    return (
                      <td key={col} style={{ background: bg, color: abs > .4 ? '#fff' : '#6B7280', borderRadius: 6, padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, minWidth: 56 }}>
                        {v.toFixed(2)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(data.strong_pairs || []).length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-bold text-white mb-4">Notable Correlations (|r| ≥ 0.3)</div>
          <div className="space-y-2">
            {data.strong_pairs.slice(0, 15).map(pair => (
              <div key={`${pair.col1}-${pair.col2}`} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-300 w-48 truncate">{pair.col1} ↔ {pair.col2}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.abs(pair.value) * 100}%`, background: pair.value > 0 ? '#10B981' : '#EF4444' }} />
                </div>
                <span className="text-xs font-bold font-mono w-14 text-right" style={{ color: pair.value > 0 ? '#10B981' : '#EF4444' }}>
                  {pair.value > 0 ? '+' : ''}{pair.value.toFixed(3)}
                </span>
                <span className="text-xs text-gray-500 w-20">{pair.strength}</span>
                <span className={`badge text-[10px] ${pair.direction === 'Positive' ? 'badge-green' : 'badge-red'}`}>{pair.direction}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Outliers ────────────────────────────────────────────────────
function OutlierTab({ sid, ds }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOutliers(sid).then(setData).catch(() => toast.error('Failed to load outlier data')).finally(() => setLoading(false))
  }, [sid])

  if (loading) return <Spinner />
  const outliers = data?.outliers || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {outliers.slice(0, 6).map(o => (
          <div key={o.col} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-white truncate mr-2">{o.col}</div>
              <span className="badge text-[10px]" style={{ background: `${severityColor(o.severity)}18`, color: severityColor(o.severity) }}>
                {o.severity}
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-3">{o.outlier_count} outliers ({o.outlier_pct}%)</div>
            {/* Box plot visual */}
            <div className="relative h-8 my-2">
              {(() => {
                const range = (o.max || 0) - (o.min || 0) || 1
                const pct = v => ((v - (o.min || 0)) / range * 100)
                return (
                  <>
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700" />
                    <div className="absolute top-1" style={{ left: `${pct(o.q1)}%`, width: `${pct(o.q3) - pct(o.q1)}%`, height: '75%', background: 'rgba(59,130,246,.2)', border: '2px solid #3B82F6', borderRadius: 3 }} />
                    <div className="absolute" style={{ top: '15%', left: `${pct(o.median || ((o.q1 + o.q3) / 2))}%`, width: 3, height: '70%', background: '#3B82F6', transform: 'translateX(-50%)' }} />
                    <div className="absolute" style={{ top: '30%', left: `${pct(o.min)}%`, width: 2, height: '40%', background: '#6B7280' }} />
                    <div className="absolute" style={{ top: '30%', left: `${pct(o.max)}%`, width: 2, height: '40%', background: '#6B7280' }} />
                  </>
                )
              })()}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{fmtNum(o.min)}</span><span>Q1</span><span>Med</span><span>Q3</span><span>{fmtNum(o.max)}</span>
            </div>
            <div className="mt-2 text-[10px] text-gray-500">Fences: [{fmtNum(o.lower_fence)}, {fmtNum(o.upper_fence)}]</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="text-sm font-bold text-white mb-4">Outlier Summary</div>
        <table className="w-full text-xs">
          <thead>
            <tr>{['Column','Outliers','%','Severity','Q1','Q3','IQR','Lower Fence','Upper Fence'].map(h => (
              <th key={h} className="table-head-cell">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {outliers.map((o, i) => (
              <tr key={o.col} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                <td className="table-cell font-bold text-blue-400">{o.col}</td>
                <td className="table-cell">{o.outlier_count}</td>
                <td className="table-cell" style={{ color: severityColor(o.severity) }}>{o.outlier_pct}%</td>
                <td className="table-cell">
                  <span className="badge text-[10px]" style={{ background: `${severityColor(o.severity)}15`, color: severityColor(o.severity) }}>{o.severity}</span>
                </td>
                {[o.q1, o.q3, o.iqr, o.lower_fence, o.upper_fence].map((v, j) => (
                  <td key={j} className="table-cell">{fmtNum(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pivot Table ─────────────────────────────────────────────────
function PivotTab({ sid, ds }) {
  const an = ds.analysis || {}
  const catCols = an.cat_cols || []
  const numCols = an.num_cols || []
  const [rowCol, setRowCol] = useState(catCols[0] || '')
  const [valCol, setValCol] = useState(numCols[0] || '')
  const [agg, setAgg] = useState('mean')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!rowCol || !valCol) return
    setLoading(true)
    try {
      const res = await getPivot(sid, rowCol, valCol, agg)
      setData(res)
    } catch (e) {
      toast.error('Pivot failed: ' + (e?.response?.data?.detail || e.message))
    } finally { setLoading(false) }
  }

  useEffect(() => { if (rowCol && valCol) run() }, [rowCol, valCol, agg])

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-sm font-bold text-white mb-4">Pivot Configuration</div>
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Group By (Categorical)', val: rowCol, set: setRowCol, opts: catCols },
            { label: 'Measure (Numeric)',       val: valCol, set: setValCol, opts: numCols },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{f.label}</label>
              <select value={f.val} onChange={e => f.set(e.target.value)} className="select">
                {f.opts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Aggregation</label>
            <select value={agg} onChange={e => setAgg(e.target.value)} className="select">
              {['mean','sum','count','min','max','median'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={run} disabled={loading || !rowCol || !valCol} className="btn-primary">
              {loading ? <><span className="spin-s" />Running…</> : '↺ Run Pivot'}
            </button>
          </div>
        </div>
      </div>

      {data?.data?.length > 0 && (
        <>
          <ChartRenderer chart={{ id: 99, type: 'bar', title: `${agg.toUpperCase()} of ${valCol} by ${rowCol}`, rotateX: true,
            data: data.data.slice(0, 15).map(r => ({ name: r.group, value: r[agg] })) }} height={280} />
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>{[rowCol,'Count','Mean','Sum','Min','Median','Max','Std'].map(h => <th key={h} className="table-head-cell">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.data.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                      <td className="table-cell font-bold text-blue-400">{r.group}</td>
                      {[r.count, r.mean, r.sum, r.min, r.median, r.max, r.std].map((v, j) => (
                        <td key={j} className="table-cell">{fmtNum(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Forecast ────────────────────────────────────────────────────
function ForecastTab({ sid, ds }) {
  const an = ds.analysis || {}
  const numCols = an.num_cols || []
  const [col, setCol] = useState(numCols[0] || '')
  const [periods, setPeriods] = useState(10)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!col) return
    setLoading(true)
    try {
      const res = await getForecast(sid, col, periods)
      setData(res)
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Forecast failed')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (col) run() }, [col])

  const chartData = useMemo(() => {
    if (!data) return []
    const hist = (data.historical || []).map(p => ({ x: p.x, y: p.y, forecast: null, y_upper: null, y_lower: null }))
    const fore = (data.forecast || []).map(p => ({ x: p.x, y: null, forecast: p.y, y_upper: p.y_upper, y_lower: p.y_lower }))
    return [...hist, ...fore]
  }, [data])

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-sm font-bold text-white mb-4">Forecast Configuration</div>
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Column to Forecast</label>
            <select value={col} onChange={e => setCol(e.target.value)} className="select">
              {numCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Forecast Periods</label>
            <input type="number" min={1} max={50} value={periods} onChange={e => setPeriods(+e.target.value)} className="input w-28" />
          </div>
          <button onClick={run} disabled={loading || !col} className="btn-primary">
            {loading ? <><span className="spin-s" />Forecasting…</> : '▶ Run Forecast'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { l: 'Trend',      v: data.trend_direction, c: data.trend_direction === 'upward' ? '#10B981' : data.trend_direction === 'downward' ? '#EF4444' : '#F59E0B' },
              { l: 'R² Score',   v: data.r_squared?.toFixed(4), c: (data.r_squared || 0) > .7 ? '#10B981' : '#F59E0B' },
              { l: 'RMSE',       v: fmtNum(data.rmse), c: '#8B5CF6' },
              { l: 'Trend/Period', v: `${data.trend_pct_per_period > 0 ? '+' : ''}${data.trend_pct_per_period}%`, c: '#3B82F6' },
            ].map(k => (
              <div key={k.l} className="card p-4">
                <div className="text-lg font-black mb-1 capitalize" style={{ color: k.c }}>{k.v}</div>
                <div className="text-xs text-gray-400">{k.l}</div>
              </div>
            ))}
          </div>
          <ChartRenderer
            chart={{ id: 100, type: 'forecast', title: `Forecast — ${col} (${periods} periods ahead)`, splitAt: data.historical?.length, data: chartData }}
            height={320}
          />
          <div className="card p-5">
            <div className="text-sm font-bold text-white mb-3">Forecast Values</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr>{['Period','Forecast','Lower (95%)','Upper (95%)'].map(h => <th key={h} className="table-head-cell">{h}</th>)}</tr></thead>
                <tbody>
                  {(data.forecast || []).map((p, i) => (
                    <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-900/30'}>
                      <td className="table-cell">+{i + 1}</td>
                      <td className="table-cell font-bold text-blue-400">{fmtNum(p.y)}</td>
                      <td className="table-cell text-gray-500">{fmtNum(p.y_lower)}</td>
                      <td className="table-cell text-gray-500">{fmtNum(p.y_upper)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full spin" />
    </div>
  )
}
