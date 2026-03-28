import { useEffect, useState } from 'react'
import '../styles/HistoricalView.css'

const RANGE_OPTIONS = [
  { value: '1h', label: '1 час' },
  { value: '6h', label: '6 часов' },
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' }
]

function formatMetricValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0'
  }

  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '—'
  }

  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function HistoryChart({ points }) {
  if (!points.length) {
    return <div className="history-empty">Нет данных за выбранный период.</div>
  }

  const width = 960
  const height = 280
  const padding = 22
  const numbers = points.map(point => point.value)
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  const range = max - min || 1

  const chartPoints = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
    return [x, y]
  })

  const polyline = chartPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const first = chartPoints[0]
  const last = chartPoints[chartPoints.length - 1]
  const areaPath = `M ${first[0].toFixed(1)},${height - padding} ` +
    chartPoints.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${last[0].toFixed(1)},${height - padding} Z`

  return (
    <div className="history-chart-shell">
      <div className="history-axis-labels">
        <span>{formatMetricValue(max)}</span>
        <span>{formatMetricValue((max + min) / 2)}</span>
        <span>{formatMetricValue(min)}</span>
      </div>
      <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="history-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#44f6ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#44f6ff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#history-fill)" />
        <polyline points={polyline} fill="none" stroke="#44f6ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="5" fill="#44f6ff" />
      </svg>
    </div>
  )
}

export function HistoricalView({ apiBaseUrl, metrics }) {
  const [selectedTopic, setSelectedTopic] = useState('')
  const [windowSize, setWindowSize] = useState('24h')
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedTopic && metrics.length) {
      setSelectedTopic(metrics[0].topic)
    }
  }, [metrics, selectedTopic])

  useEffect(() => {
    if (!selectedTopic) {
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(`${apiBaseUrl}/api/history?topic=${encodeURIComponent(selectedTopic)}&window=${windowSize}`, {
      signal: controller.signal
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить историю')
        }
        return response.json()
      })
      .then(data => {
        const nextPoints = (data.points || [])
          .filter(point => typeof point.value === 'number')
          .map(point => ({
            timestamp: point.timestamp,
            value: point.value
          }))
        setPoints(nextPoints)
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [apiBaseUrl, selectedTopic, windowSize])

  const selectedMetric = metrics.find(metric => metric.topic === selectedTopic)
  const values = points.map(point => point.value)
  const latest = values.length ? values[values.length - 1] : 0
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  const recentPoints = [...points].slice(-8).reverse()

  if (!metrics.length) {
    return (
      <div className="historical-view">
        <div className="historical-loading-card">Ожидание метрик от backend...</div>
      </div>
    )
  }

  return (
    <div className="historical-view">
      <section className="history-panel">
        <div className="history-header">
          <div>
            <p className="history-kicker">История данных</p>
            <h2>{selectedMetric?.label ?? 'Выберите метрику'}</h2>
            <p className="history-subtitle">
              Исторические значения из PostgreSQL по topic <span>{selectedTopic || '—'}</span>
            </p>
          </div>
          <div className="history-controls">
            <label className="history-control">
              <span>Метрика</span>
              <select value={selectedTopic} onChange={event => setSelectedTopic(event.target.value)}>
                {metrics.map(metric => (
                  <option key={metric.topic} value={metric.topic}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="history-ranges">
              {RANGE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`history-range ${windowSize === option.value ? 'active' : ''}`}
                  onClick={() => setWindowSize(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="history-stats">
          <article className="history-stat-card">
            <span>Последнее</span>
            <strong>{formatMetricValue(latest)} {selectedMetric?.unit}</strong>
          </article>
          <article className="history-stat-card">
            <span>Минимум</span>
            <strong>{formatMetricValue(minimum)} {selectedMetric?.unit}</strong>
          </article>
          <article className="history-stat-card">
            <span>Максимум</span>
            <strong>{formatMetricValue(maximum)} {selectedMetric?.unit}</strong>
          </article>
          <article className="history-stat-card">
            <span>Среднее</span>
            <strong>{formatMetricValue(average)} {selectedMetric?.unit}</strong>
          </article>
        </div>

        <div className="history-content-grid">
          <section className="history-chart-card">
            <div className="history-card-header">
              <h3>График за период</h3>
              <span>{loading ? 'Загрузка...' : `${points.length} точек`}</span>
            </div>
            {error ? <div className="history-error">{error}</div> : <HistoryChart points={points} />}
          </section>

          <section className="history-table-card">
            <div className="history-card-header">
              <h3>Последние записи</h3>
              <span>{windowSize}</span>
            </div>
            <div className="history-rows">
              {recentPoints.length ? recentPoints.map(point => (
                <div key={`${point.timestamp}-${point.value}`} className="history-row">
                  <span>{formatTimestamp(point.timestamp)}</span>
                  <strong>{formatMetricValue(point.value)} {selectedMetric?.unit}</strong>
                </div>
              )) : <div className="history-empty">Нет данных за выбранный период.</div>}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
