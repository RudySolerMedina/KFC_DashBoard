import { useEffect, useMemo, useState } from 'react'
import '../styles/HistoricalView.css'

const RANGE_OPTIONS = [
  { value: '1h', label: '1 час' },
  { value: '6h', label: '6 часов' },
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
  { value: '1y', label: '1 год' }
]

const AREA_OPTIONS = [
  {
    id: 'total_kfc',
    label: 'Общая нагрузка, KFC',
    photo: '/areas/total_kfc.png',
    topics: [
      'Nevinnomisk/devices/energomera303_00000201/controls/Urms L1',
      'Nevinnomisk/devices/energomera303_00000201/controls/Urms L2',
      'Nevinnomisk/devices/energomera303_00000201/controls/Urms L3',
      'Nevinnomisk/devices/energomera303_00000201/controls/Irms L1',
      'Nevinnomisk/devices/energomera303_00000201/controls/Irms L2',
      'Nevinnomisk/devices/energomera303_00000201/controls/Irms L3',
      'Nevinnomisk/devices/energomera303_00000201/controls/P L1',
      'Nevinnomisk/devices/energomera303_00000201/controls/P L2',
      'Nevinnomisk/devices/energomera303_00000201/controls/P L3',
      'Nevinnomisk/devices/energomera303_00000201/controls/PF L1',
      'Nevinnomisk/devices/energomera303_00000201/controls/PF L2',
      'Nevinnomisk/devices/energomera303_00000201/controls/PF L3',
      'Nevinnomisk/devices/energomera303_00000201/controls/Total P',
      'Nevinnomisk/devices/energomera303_00000201/controls/Total A energy'
    ]
  },
  { id: 'f100_left', label: 'F100 Левая (Закрытые жаровни:1.1)', photo: '/areas/f100_left.png', topics: [] },
  { id: 'f100_right', label: 'F100 Правая (Закрытые жаровни:1.2)', photo: '/areas/f100_right.png', topics: [] },
  { id: 'fastron_1_left', label: 'FASTRON_1 Левая (Открытые жаровни:2.1)', photo: '/areas/fastron_1_left.png', topics: [] },
  { id: 'fastron_2_mid', label: 'FASTRON_2 Средная (Открытые жаровни:2.2)', photo: '/areas/fastron_2_mid.png', topics: [] },
  { id: 'fastron_3_right', label: 'FASTRON_3 Правая (Открытые жаровни:2.3)', photo: '/areas/fastron_3_right.png', topics: [] },
  { id: 'eee_142_right', label: 'Жаровня EEE 142 правая (Фритюрница на кухне картофеля фри:3.2)', photo: '/areas/eee_142_right.png', topics: [] },
  { id: 'eee_142_left', label: 'Жаровня EEE 142 левая (Фритюрница на кухне картофеля фри:3.1)', photo: '/areas/eee_142_left.png', topics: [] },
  { id: 'heat_cab', label: 'ТЕПЛОВОЙ ШКАФ', topics: [] },
  { id: 'follett_1050', label: 'Шкаф тепловой FOLLETT 1050BK (Тепловая витрина)', photo: '/areas/follett_1050.png', topics: [] },
  { id: 'toaster_vertical', label: 'ТОСТЕР ВЕРТИКАЛЬНЫЙ', photo: '/areas/toaster_vertical.png', topics: [] },
  { id: 'toaster_horizontal', label: 'ТОСТЕР ГОРИЗОНТАЛЬНЫЙ', photo: '/areas/toaster_horizontal.png', topics: [] },
  { id: 'heat_903_12', label: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.2)', photo: '/areas/heat_903_12.png', topics: [] },
  { id: 'heat_903_11', label: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.1)', photo: '/areas/heat_903_11.png', topics: [] },
  { id: 'heat_903_13', label: 'Тепловой шкаф 903 (Тепловой шкаф на кухне 1.3)', photo: '/areas/heat_903_13.png', topics: [] },
  { id: 'silain', label: 'Силайн (очень малый тепловой шкаф)', photo: '/areas/silain.png', topics: [] },
  { id: 'freezer_1', label: 'Морозильная камера 1', topics: [] },
  { id: 'freezer_2', label: 'Морозильная камера 2', photo: '/areas/freezer_2.png', topics: [] },
  { id: 'cold_veg', label: 'Холодильная камера (овощн.)', topics: [] },
  { id: 'cold_defrost_chicken', label: 'Холодильная камера (дефрост) для курицы', topics: [] },
  { id: 'coffee_1', label: 'Кофемашина 1', photo: '/areas/coffee_1.png', topics: [] },
  { id: 'coffee_2', label: 'Кофемашина 2', photo: '/areas/coffee_2.png', topics: [] },
  { id: 'salad_fridge', label: 'Холодильник саладет', topics: [] },
  { id: 'boiler_1', label: 'Бойлер 1', topics: [] },
  { id: 'boiler_2', label: 'Бойлер 2', topics: [] },
  { id: 'cocktail', label: 'Коктельница', photo: '/areas/cocktail.png', topics: [] },
  { id: 'heat_curtain', label: 'Тепловая завесы', photo: '/areas/heat_curtain.png', topics: [] },
  { id: 'ac', label: 'Кондиционеры', photo: '/areas/ac.png', topics: [] },
  { id: 'heaters', label: 'Обогреватели', topics: [] },
  { id: 'outdoor_light', label: 'Уличное освещение', topics: [] },
  { id: 'rest_light_group', label: 'Группа Освещение в ресторане', topics: [] },
  { id: 'vent_panel_1', label: 'ЩИТ вентиляции 1', topics: [] },
  {
    id: 'hall_1',
    label: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)',
    topics: [
      'Nevinnomisk/devices/wb-msw-v4_41/controls/Temperature',
      'Nevinnomisk/devices/wb-msw-v4_41/controls/Humidity',
      'Nevinnomisk/devices/wb-msw-v4_41/controls/Illuminance',
      'Nevinnomisk/devices/wb-msw-v4_41/controls/CO2',
      'Nevinnomisk/devices/wb-msw-v4_41/controls/Air Quality (VOC)',
      'Nevinnomisk/devices/wb-msw-v4_41/controls/Sound Level'
    ]
  },
  { id: 'hall_2', label: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)', topics: [] },
  { id: 'payment_zone', label: 'ЗОНА ОПЛАТЫ ЗАКАЗА', topics: [] },
  { id: 'corridor', label: 'КОРИДОР', topics: [] },
  { id: 'hot_shop_bread', label: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ', topics: [] },
  { id: 'distribution', label: 'РАЗДАТОЧНАЯ', topics: [] },
  { id: 'cold_defrost_chicken_caps', label: 'ХОЛОДИЛЬНАЯ КАМЕРА (ДЕФРОСТ) ДЛЯ КУРИЦЫ', topics: [] },
  { id: 'freezer_1_caps', label: 'МОРОЗИЛЬНАЯ КАМЕРА 1', topics: [] },
  { id: 'freezer_2_caps', label: 'МОРОЗИЛЬНАЯ КАМЕРА 2', topics: [] },
  { id: 'cold_veg_caps', label: 'ХОЛОДИЛЬНАЯ КАМЕРА (ОВОЩН.)', topics: [] },
  { id: 'technical_boilers', label: 'ТЕХНИЧЕСКОЕ ПОМЕЩЕНИЕ (БОЙЛЕРЫ)', topics: [] },
  {
    id: 'weather',
    label: 'Погода',
    topics: [
      'Nevinnomisk/devices/weather_owm/controls/Температура',
      'Nevinnomisk/devices/weather_owm/controls/Влажность',
      'Nevinnomisk/devices/weather_owm/controls/Ветер'
    ]
  }
]

const PHASE_COLORS = ['#44f6ff', '#fbbf24', '#4ade80']

const AREA_GROUPING = {
  total_kfc: {
    accentColor: '#44f6ff',
    phaseColors: PHASE_COLORS,
    pinned: [
      'Nevinnomisk/devices/energomera303_00000201/controls/Total P',
      'Nevinnomisk/devices/energomera303_00000201/controls/Total A energy',
    ],
    groups: [
      {
        id: 'voltage_phases',
        label: 'Напряжение по фазам',
        unit: 'В',
        lines: [
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L1', label: 'Линия L1' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L2', label: 'Линия L2' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Urms L3', label: 'Линия L3' },
        ]
      },
      {
        id: 'current_phases',
        label: 'Ток по фазам',
        unit: 'А',
        lines: [
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L1', label: 'Линия L1' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L2', label: 'Линия L2' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/Irms L3', label: 'Линия L3' },
        ]
      },
      {
        id: 'power_phases',
        label: 'Мощность по фазам',
        unit: 'кВт',
        lines: [
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/P L1', label: 'Линия L1' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/P L2', label: 'Линия L2' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/P L3', label: 'Линия L3' },
        ]
      },
      {
        id: 'pf_phases',
        label: 'Коэффициент мощности по фазам',
        unit: '',
        lines: [
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/PF L1', label: 'Линия L1' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/PF L2', label: 'Линия L2' },
          { topic: 'Nevinnomisk/devices/energomera303_00000201/controls/PF L3', label: 'Линия L3' },
        ]
      },
    ]
  }
}

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

function formatXLabel(timestamp, windowSize) {
  const d = new Date(timestamp)
  if (windowSize === '1y') {
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }
  if (windowSize === '30d' || windowSize === '90d') {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  if (windowSize === '7d') {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}ч`
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function computeXTicks(minTime, maxTime, windowSize, count = 5) {
  const ticks = []
  for (let i = 0; i < count; i++) {
    const t = minTime + (i / (count - 1)) * (maxTime - minTime)
    ticks.push({ time: t, label: formatXLabel(t, windowSize) })
  }
  return ticks
}

function HistoryChart({ points, chartId, windowSize, accentColor = '#44f6ff' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

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

  const times = points.map(p => new Date(p.timestamp).getTime()).filter(t => !Number.isNaN(t))
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeRange = maxTime - minTime || 1

  const chartPoints = points.map(point => {
    const t = new Date(point.timestamp).getTime()
    const x = padding + ((t - minTime) / timeRange) * (width - padding * 2)
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
    return [x, y]
  })

  const polyline = chartPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const first = chartPoints[0]
  const last = chartPoints[chartPoints.length - 1]
  const areaPath = `M ${first[0].toFixed(1)},${height - padding} ` +
    chartPoints.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${last[0].toFixed(1)},${height - padding} Z`
  const xTicks = computeXTicks(minTime, maxTime, windowSize)
  const hoveredPoint = hoveredIndex !== null
    ? {
        ...points[hoveredIndex],
        x: chartPoints[hoveredIndex][0],
        y: chartPoints[hoveredIndex][1],
      }
    : null

  return (
    <div className="history-chart-shell">
      <div className="history-axis-labels">
        <span>{formatMetricValue(max)}</span>
        <span>{formatMetricValue((max + min) / 2)}</span>
        <span>{formatMetricValue(min)}</span>
      </div>
      <div className="history-chart-col">
        <svg
          className="history-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.30" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${chartId})`} />
          <polyline points={polyline} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {chartPoints.map(([x, y], index) => (
            <circle
              key={`${chartId}-hit-${index}`}
              cx={x.toFixed(1)}
              cy={y.toFixed(1)}
              r="8"
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
            />
          ))}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x.toFixed(1)}
                y1={padding}
                x2={hoveredPoint.x.toFixed(1)}
                y2={(height - padding).toFixed(1)}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeDasharray="5 4"
              />
              <circle
                cx={hoveredPoint.x.toFixed(1)}
                cy={hoveredPoint.y.toFixed(1)}
                r="5.5"
                fill={accentColor}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.5"
              />
            </g>
          )}
          <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r="5" fill={accentColor} />
        </svg>
        {hoveredPoint && (
          <div
            className="history-chart-tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <strong>{formatMetricValue(hoveredPoint.value)}</strong>
            <span>{formatTimestamp(hoveredPoint.timestamp)}</span>
          </div>
        )}
        <div className="history-xaxis">
          {xTicks.map(tick => <span key={tick.time}>{tick.label}</span>)}
        </div>
      </div>
    </div>
  )
}

function MultiLineChart({ lines, windowSize }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const allPoints = lines.flatMap(line => line.points)
  if (!allPoints.length) {
    return <div className="history-empty">Нет данных за выбранный период.</div>
  }

  const width = 960
  const height = 280
  const padding = 22

  const allValues = allPoints.map(p => p.value)
  const allTimes = allPoints
    .map(p => new Date(p.timestamp).getTime())
    .filter(t => !Number.isNaN(t))

  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const valRange = maxVal - minVal || 1
  const minTime = Math.min(...allTimes)
  const maxTime = Math.max(...allTimes)
  const timeRange = maxTime - minTime || 1

  function mapXY(point) {
    const t = new Date(point.timestamp).getTime()
    const x = padding + ((t - minTime) / timeRange) * (width - padding * 2)
    const y = height - padding - ((point.value - minVal) / valRange) * (height - padding * 2)
    return [x, y]
  }

  const xTicks = computeXTicks(minTime, maxTime, windowSize)

  return (
    <div className="history-chart-shell">
      <div className="history-axis-labels">
        <span>{formatMetricValue(maxVal)}</span>
        <span>{formatMetricValue((maxVal + minVal) / 2)}</span>
        <span>{formatMetricValue(minVal)}</span>
      </div>
      <div className="history-chart-col">
        <svg
          className="history-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {lines.map((line, lineIndex) => {
            if (!line.points.length) return null
            const chartPoints = line.points.map(mapXY)
            const polyline = chartPoints
              .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
              .join(' ')
            const last = chartPoints[chartPoints.length - 1]
            return (
              <g key={lineIndex}>
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <circle
                  cx={last[0].toFixed(1)}
                  cy={last[1].toFixed(1)}
                  r="4.5"
                  fill={line.color}
                />
                {chartPoints.map(([x, y], pointIndex) => {
                  const point = line.points[pointIndex]
                  return (
                    <circle
                      key={`hit-${lineIndex}-${pointIndex}`}
                      cx={x.toFixed(1)}
                      cy={y.toFixed(1)}
                      r="8"
                      fill="transparent"
                      onMouseEnter={() => {
                        setHoveredPoint({
                          x,
                          y,
                          value: point.value,
                          timestamp: point.timestamp,
                          color: line.color,
                          label: line.label,
                        })
                      }}
                    />
                  )
                })}
              </g>
            )
          })}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x.toFixed(1)}
                y1={padding}
                x2={hoveredPoint.x.toFixed(1)}
                y2={(height - padding).toFixed(1)}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeDasharray="5 4"
              />
              <circle
                cx={hoveredPoint.x.toFixed(1)}
                cy={hoveredPoint.y.toFixed(1)}
                r="5.5"
                fill={hoveredPoint.color}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
        {hoveredPoint && (
          <div
            className="history-chart-tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <strong>{hoveredPoint.label}: {formatMetricValue(hoveredPoint.value)}</strong>
            <span>{formatTimestamp(hoveredPoint.timestamp)}</span>
          </div>
        )}
        <div className="history-xaxis">
          {xTicks.map(tick => <span key={tick.time}>{tick.label}</span>)}
        </div>
      </div>
    </div>
  )
}

function topicTail(topic) {
  return topic.split('/').pop() || topic
}

function toChartId(topic) {
  return `history-fill-${topic.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function SingleTopicCard({ item, loading, windowSize, accentColor = '#44f6ff' }) {
  const values = item.points.map(p => p.value)
  const latest = values.length ? values[values.length - 1] : 0
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const average = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
  const recentPoints = [...item.points].slice(-6).reverse()

  return (
    <section className="history-topic-card history-electric-card">
      <div className="history-electric-frame" aria-hidden="true">
        <div className="history-border-outer">
          <div className="history-main-card-layer"></div>
        </div>
        <div className="history-glow-layer-1"></div>
        <div className="history-glow-layer-2"></div>
        <div className="history-overlay-1"></div>
        <div className="history-overlay-2"></div>
        <div className="history-background-glow"></div>
      </div>
      <div className="history-card-header">
        <div>
          <h3>{item.label}</h3>
          <span className="history-topic-path">{item.topic}</span>
        </div>
        <span>{loading ? 'Загрузка...' : `${item.points.length} точек`}</span>
      </div>
      <div className="history-stats mini">
        <article className="history-stat-card">
          <span>Последнее</span>
          <strong>{formatMetricValue(latest)} {item.unit}</strong>
        </article>
        <article className="history-stat-card">
          <span>Минимум</span>
          <strong>{formatMetricValue(minimum)} {item.unit}</strong>
        </article>
        <article className="history-stat-card">
          <span>Максимум</span>
          <strong>{formatMetricValue(maximum)} {item.unit}</strong>
        </article>
        <article className="history-stat-card">
          <span>Среднее</span>
          <strong>{formatMetricValue(average)} {item.unit}</strong>
        </article>
      </div>
      <div className="history-topic-grid">
        <section className="history-chart-card">
          <HistoryChart points={item.points} chartId={toChartId(item.topic)} windowSize={windowSize} accentColor={accentColor} />
        </section>
        <section className="history-table-card">
          <div className="history-rows">
            {recentPoints.length
              ? recentPoints.map(point => (
                  <div
                    key={`${item.topic}-${point.timestamp}-${point.value}`}
                    className="history-row"
                  >
                    <span>{formatTimestamp(point.timestamp)}</span>
                    <strong>{formatMetricValue(point.value)} {item.unit}</strong>
                  </div>
                ))
              : <div className="history-empty">Нет данных за выбранный период.</div>}
          </div>
        </section>
      </div>
    </section>
  )
}

function GroupedTopicCard({ group, seriesByTopic, loading, windowSize, phaseColors = PHASE_COLORS }) {
  const linesData = group.lines.map((line, i) => ({
    points: seriesByTopic[line.topic]?.points ?? [],
    color: phaseColors[i % phaseColors.length],
    label: line.label,
  }))
  const totalPts = linesData.reduce((n, l) => n + l.points.length, 0)

  return (
    <section className="history-topic-card history-electric-card">
      <div className="history-electric-frame" aria-hidden="true">
        <div className="history-border-outer">
          <div className="history-main-card-layer"></div>
        </div>
        <div className="history-glow-layer-1"></div>
        <div className="history-glow-layer-2"></div>
        <div className="history-overlay-1"></div>
        <div className="history-overlay-2"></div>
        <div className="history-background-glow"></div>
      </div>
      <div className="history-card-header">
        <h3>{group.label}</h3>
        <span>{loading ? 'Загрузка...' : `${totalPts} точек`}</span>
      </div>
      <div className="history-stats mini">
        {linesData.map((line, i) => {
          const vals = line.points.map(p => p.value)
          const last = vals.length ? vals[vals.length - 1] : null
          const minV = vals.length ? Math.min(...vals) : null
          const maxV = vals.length ? Math.max(...vals) : null
          return (
            <article
              key={i}
              className="history-stat-card"
              style={{ borderLeft: `3px solid ${line.color}` }}
            >
              <span style={{ color: line.color }}>{line.label}</span>
              <strong style={{ color: line.color }}>
                {last !== null
                  ? `${formatMetricValue(last)}${group.unit ? ' ' + group.unit : ''}`
                  : '—'}
              </strong>
              {minV !== null && (
                <small>
                  {formatMetricValue(minV)} – {formatMetricValue(maxV)}
                  {group.unit ? ` ${group.unit}` : ''}
                </small>
              )}
            </article>
          )
        })}
      </div>
      <section className="history-chart-card">
        <MultiLineChart lines={linesData} windowSize={windowSize} />
        <div className="history-multiline-legend">
          {linesData.map((line, i) => (
            <div key={i} className="history-legend-item">
              <span className="history-legend-dot" style={{ background: line.color }} />
              <span>{line.label}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

export function HistoricalView({ apiBaseUrl, metrics }) {
  const [selectedAreaId, setSelectedAreaId] = useState(AREA_OPTIONS[0].id)
  const [windowSize, setWindowSize] = useState('24h')
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const metricByTopic = useMemo(
    () => Object.fromEntries(metrics.map(metric => [metric.topic, metric])),
    [metrics]
  )
  const selectedArea = AREA_OPTIONS.find(area => area.id === selectedAreaId) || AREA_OPTIONS[0]

  useEffect(() => {
    if (!selectedArea) {
      return undefined
    }

    if (!selectedArea.topics.length) {
      setSeries([])
      setError('')
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    Promise.all(
      selectedArea.topics.map(topic =>
        fetch(`${apiBaseUrl}/api/history?topic=${encodeURIComponent(topic)}&window=${windowSize}`, {
          signal: controller.signal
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Не удалось загрузить историю')
            }
            return response.json()
          })
          .then(data => {
            const points = (data.points || [])
              .filter(point => typeof point.value === 'number')
              .map(point => ({
                timestamp: point.timestamp,
                value: point.value
              }))
            const metric = metricByTopic[topic]
            return {
              topic,
              label: metric?.label || topicTail(topic),
              unit: metric?.unit || '',
              points
            }
          })
      )
    )
      .then(nextSeries => {
        setSeries(nextSeries)
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError' && !controller.signal.aborted) {
          setError(fetchError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [apiBaseUrl, metricByTopic, selectedArea, windowSize])

  const topicsConfigured = selectedArea?.topics.length || 0
  const topicsWithData = series.filter(item => item.points.length > 0).length
  const totalPoints = series.reduce((sum, item) => sum + item.points.length, 0)
  const latestTimestamp = series
    .flatMap(item => item.points.map(point => point.timestamp))
    .filter(Boolean)
    .sort()
    .pop()

  if (!metrics.length) {
    return (
      <div className="historical-view">
        <div className="historical-loading-card">Ожидание метрик от backend...</div>
      </div>
    )
  }

  const grouping = AREA_GROUPING[selectedAreaId]
  const seriesByTopic = Object.fromEntries(series.map(s => [s.topic, s]))

  return (
    <div className="historical-view">
      <section className="history-panel">
        <div className="history-header">
          <div>
            <p className="history-kicker">История данных</p>
            <h2>{selectedArea?.label ?? 'Выберите метрику'}</h2>
            {selectedArea?.photo
              ? <img
                  src={selectedArea.photo}
                  alt={selectedArea.label}
                  className="history-area-photo"
                />
              : <p className="history-subtitle">
                  Посмотрите, как менялись показатели оборудования за выбранный период
                </p>
            }
          </div>
          <div className="history-controls">
            <label className="history-control">
              <span>Метрика</span>
              <select value={selectedAreaId} onChange={event => setSelectedAreaId(event.target.value)}>
                {AREA_OPTIONS.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.label}
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
            <span>Топиков в метрике</span>
            <strong>{topicsConfigured}</strong>
          </article>
          <article className="history-stat-card">
            <span>С данными</span>
            <strong>{topicsWithData}</strong>
          </article>
          <article className="history-stat-card">
            <span>Всего точек</span>
            <strong>{totalPoints}</strong>
          </article>
          <article className="history-stat-card">
            <span>Последнее обновление</span>
            <strong>{formatTimestamp(latestTimestamp)}</strong>
          </article>
        </div>

        <div className="history-series-list">
          {!selectedArea.topics.length && (
            <div className="history-chart-card">
              <div className="history-empty">Для этой метрики пока не привязаны topics.</div>
            </div>
          )}

          {error && <div className="history-error">{error}</div>}

          {!error && selectedArea.topics.length > 0 && (
            grouping
              ? <>
                  {grouping.pinned.map(topic => {
                    const item = seriesByTopic[topic]
                    return item
                      ? <SingleTopicCard key={topic} item={item} loading={loading} windowSize={windowSize} accentColor={grouping.accentColor || '#44f6ff'} />
                      : null
                  })}
                  {grouping.groups.map(group => (
                    <GroupedTopicCard
                      key={group.id}
                      group={group}
                      seriesByTopic={seriesByTopic}
                      loading={loading}
                      windowSize={windowSize}
                      phaseColors={grouping.phaseColors || PHASE_COLORS}
                    />
                  ))}
                </>
              : series.map(item => (
                  <SingleTopicCard key={item.topic} item={item} loading={loading} windowSize={windowSize} />
                ))
          )}
        </div>
      </section>
    </div>
  )
}
