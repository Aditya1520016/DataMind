import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, ComposedChart, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useStore } from '../store'
import { CHART_COLORS, tooltipStyle } from '../utils/charts'

export default function ChartRenderer({ chart, height = 220 }) {
  const theme = useStore(s => s.theme)
  const tt = tooltipStyle(theme)
  const gridColor = theme === 'dark' ? '#1E2D3D' : '#E5E7EB'
  const axisColor = theme === 'dark' ? '#4A6078' : '#9CA3AF'

  const commonProps = {
    margin: { top: 6, right: 8, left: -16, bottom: chart.rotateX ? 32 : 6 },
  }
  const axisProps = {
    tick: { fill: axisColor, fontSize: 11 },
    ...(chart.rotateX ? { angle: -30, textAnchor: 'end' } : {}),
  }

  const renderChart = () => {
    switch (chart.type) {
      case 'bar':
        return (
          <BarChart data={chart.data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chart.data?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={chart.data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fill: axisColor, fontSize: 11 }} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <Line type="monotone" dataKey="y" stroke={chart.color || CHART_COLORS[0]} strokeWidth={2} dot={false} />
            {chart.forecast && (
              <Line type="monotone" dataKey="y_forecast" stroke={CHART_COLORS[2]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={chart.data} {...commonProps}>
            <defs>
              <linearGradient id={`ag${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.color || CHART_COLORS[1]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={chart.color || CHART_COLORS[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fill: axisColor, fontSize: 11 }} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <Area type="monotone" dataKey="y" stroke={chart.color || CHART_COLORS[1]}
              fill={`url(#ag${chart.id})`} strokeWidth={2} />
          </AreaChart>
        )
      case 'pie':
        return (
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius={height * 0.32}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {chart.data?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip {...tt} />
            <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
          </PieChart>
        )
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" name={chart.xLabel} tick={{ fill: axisColor, fontSize: 11 }} />
            <YAxis dataKey="y" name={chart.yLabel} tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chart.data} fill={chart.color || CHART_COLORS[3]} opacity={0.75} />
          </ScatterChart>
        )
      case 'radar':
        return (
          <RadarChart data={chart.data} cx="50%" cy="50%" outerRadius="75%" {...commonProps}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: axisColor, fontSize: 10 }} />
            <Radar dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.25} />
            <Tooltip {...tt} />
          </RadarChart>
        )
      case 'composed':
        return (
          <ComposedChart data={chart.data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fill: axisColor, fontSize: 11 }} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <Bar dataKey="bar" fill={CHART_COLORS[0]} radius={[3,3,0,0]} opacity={0.8} />
            <Line type="monotone" dataKey="line" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
          </ComposedChart>
        )
      case 'histogram':
        return (
          <BarChart data={chart.data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="range" tick={{ fill: axisColor, fontSize: 10 }} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <Bar dataKey="count" fill={chart.color || CHART_COLORS[0]} radius={[3,3,0,0]} />
          </BarChart>
        )
      case 'forecast':
        return (
          <ComposedChart data={chart.data} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fill: axisColor, fontSize: 11 }} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
            <Tooltip {...tt} />
            <ReferenceLine x={chart.splitAt} stroke={CHART_COLORS[2]} strokeDasharray="4 4" label={{ value: 'Forecast →', fill: CHART_COLORS[2], fontSize: 10 }} />
            <Area type="monotone" dataKey="y_upper" stroke="none" fill={CHART_COLORS[0]} fillOpacity={0.1} />
            <Area type="monotone" dataKey="y_lower" stroke="none" fill={CHART_COLORS[0]} fillOpacity={0.1} />
            <Line type="monotone" dataKey="y" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="Actual" />
            <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS[2]} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
          </ComposedChart>
        )
      default:
        return null
    }
  }

  return (
    <div className="card p-4 animate-fade-in">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        {chart.title}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
