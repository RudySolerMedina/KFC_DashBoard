import './MetricCard.css'

function SparkLine({ history, topicId }) {
  if (!history || history.length < 2) {
    return <div className="sparkline-empty">・・・</div>
  }

  const W = 300
  const H = 52
  const pad = 3
  const nums = history.map(Number)
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const range = max - min || 0.001

  const pts = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * W
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return [x, y]
  })

  const polyline = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const areaPath =
    `M ${first[0].toFixed(1)},${H} ` +
    pts.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${last[0].toFixed(1)},${H} Z`

  const gradId = `sg-${(topicId || 'x').replace(/[^a-zA-Z0-9]/g, '-')}`

  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#44f6ff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#44f6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="sparkline-area" d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        className="sparkline-line"
        points={polyline}
        fill="none"
        stroke="#44f6ff"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last[0].toFixed(1)}
        cy={last[1].toFixed(1)}
        r="3"
        fill="#44f6ff"
        className="sparkline-dot"
      />
    </svg>
  )
}

export function MetricCard({ metric, value, history }) {
  const numValue = typeof value === 'number'
    ? value
    : typeof value === 'object' ? (value?.value ?? 0) : parseFloat(value) || 0

  const displayValue = numValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  return (
    <div className="metric-card">
      <p className="metric-label">{metric.label}</p>
      <p className="metric-value">{displayValue}</p>
      <p className="metric-unit">{metric.unit}</p>
      <SparkLine history={history} topicId={metric.topic} />
    </div>
  )
}
