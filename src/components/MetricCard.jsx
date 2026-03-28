import './MetricCard.css'

export function MetricCard({ metric, value }) {
  const numValue = (typeof value === 'object' ? value?.value : value) || 0
  const displayValue = numValue.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })

  return (
    <div className="metric-card">
      <p className="metric-label">{metric.label}</p>
      <p className="metric-value">{displayValue}</p>
      <p className="metric-unit">{metric.unit}</p>
    </div>
  )
}
