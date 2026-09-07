export const CHART_COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#06B6D4','#F97316','#EC4899',
  '#84CC16','#14B8A6','#6366F1','#D97706',
]

export const tooltipStyle = (theme = 'dark') => ({
  contentStyle: {
    background: theme === 'dark' ? '#111827' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#1E2D3D' : '#e5e7eb'}`,
    borderRadius: '8px',
    color: theme === 'dark' ? '#e8f0fe' : '#0a0f1e',
    fontSize: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  labelStyle: { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' },
})

export const fmtNum = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

export const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(1)}%`)

export const qualityColor = (score) => {
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

export const severityColor = (s) => ({
  High: '#EF4444', Medium: '#F59E0B', Low: '#10B981'
}[s] || '#6B7280')

export const BRAND_IMAGES = {
  Netflix: [
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&h=220&fit=crop&auto=format',
  ],
  Spotify: [
    'https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500&h=220&fit=crop&auto=format',
  ],
  Amazon: [
    'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&h=220&fit=crop&auto=format',
  ],
  Airbnb: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=220&fit=crop&auto=format',
  ],
  'Finance / Stocks': [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&h=220&fit=crop&auto=format',
  ],
  Healthcare: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500&h=220&fit=crop&auto=format',
  ],
  'Human Resources': [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&h=220&fit=crop&auto=format',
  ],
  'E-Commerce / Sales': [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=220&fit=crop&auto=format',
  ],
  'Web Analytics': [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=500&h=220&fit=crop&auto=format',
  ],
  _default: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=220&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=500&h=220&fit=crop&auto=format',
  ],
}

export const getBrandImages = (brandName) =>
  BRAND_IMAGES[brandName] || BRAND_IMAGES._default
