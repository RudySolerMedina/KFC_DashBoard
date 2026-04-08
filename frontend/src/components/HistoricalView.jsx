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

function threePhaseTopics(device, channel, frequencyDevice = device) {
  const base = `Nevinnomisk/devices/${device}/controls`
  const frequencyBase = `Nevinnomisk/devices/${frequencyDevice}/controls`
  return [
    `${base}/Urms L1`,
    `${base}/Urms L2`,
    `${base}/Urms L3`,
    `${base}/Ch ${channel} Irms L1`,
    `${base}/Ch ${channel} Irms L2`,
    `${base}/Ch ${channel} Irms L3`,
    `${base}/Ch ${channel} P L1`,
    `${base}/Ch ${channel} P L2`,
    `${base}/Ch ${channel} P L3`,
    `${base}/Ch ${channel} Total P`,
    `${base}/Ch ${channel} Total AP energy`,
    `${frequencyBase}/Frequency`,
  ]
}

function singlePhaseTopics(device, channel, phase) {
  const base = `Nevinnomisk/devices/${device}/controls`
  return [
    `${base}/Urms ${phase}`,
    `${base}/Ch ${channel} Irms ${phase}`,
    `${base}/Ch ${channel} P ${phase}`,
    `${base}/Ch ${channel} AP energy ${phase}`,
    `${base}/Frequency`,
  ]
}

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
  { id: 'f100_left', label: 'F100 Левая (Закрытые жаровни:1.1)', photo: '/areas/f100_left.png', topics: threePhaseTopics('wb-map12e_58', 1) },
  { id: 'f100_right', label: 'F100 Правая (Закрытые жаровни:1.2)', photo: '/areas/f100_right.png', topics: threePhaseTopics('wb-map12e_58', 2) },
  { id: 'fastron_1_left', label: 'FASTRON_1 Левая (Открытые жаровни:2.1)', photo: '/areas/fastron_1_left.png', topics: threePhaseTopics('wb-map12e_58', 3) },
  { id: 'fastron_2_mid', label: 'FASTRON_2 Средная (Открытые жаровни:2.2)', photo: '/areas/fastron_2_mid.png', topics: threePhaseTopics('wb-map12e_58', 4) },
  { id: 'fastron_3_right', label: 'FASTRON_3 Правая (Открытые жаровни:2.3)', photo: '/areas/fastron_3_right.png', topics: threePhaseTopics('wb-map12e_34', 1) },
  { id: 'eee_142_right', label: 'Жаровня EEE 142 правая (Фритюрница на кухне картофеля фри:3.2)', photo: '/areas/eee_142_right.png', topics: threePhaseTopics('wb-map12e_34', 3, 'wb-map12e_58') },
  { id: 'eee_142_left', label: 'Жаровня EEE 142 левая (Фритюрница на кухне картофеля фри:3.1)', photo: '/areas/eee_142_left.png', topics: threePhaseTopics('wb-map12e_34', 2) },
  { id: 'heat_cab', label: 'ТЕПЛОВОЙ ШКАФ', topics: singlePhaseTopics('wb-map12e_243', 3, 'L1') },
  { id: 'follett_1050', label: 'Шкаф тепловой FOLLETT 1050BK (Тепловая витрина)', photo: '/areas/follett_1050.png', topics: singlePhaseTopics('wb-map12e_243', 3, 'L2') },
  { id: 'toaster_vertical', label: 'ТОСТЕР ВЕРТИКАЛЬНЫЙ', photo: '/areas/toaster_vertical.png', topics: singlePhaseTopics('wb-map12e_243', 3, 'L3') },
  { id: 'toaster_horizontal', label: 'ТОСТЕР ГОРИЗОНТАЛЬНЫЙ', photo: '/areas/toaster_horizontal.png', topics: singlePhaseTopics('wb-map12e_243', 4, 'L1') },
  { id: 'heat_903_12', label: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.2)', photo: '/areas/heat_903_12.png', topics: singlePhaseTopics('wb-map12e_243', 4, 'L2') },
  { id: 'heat_903_11', label: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.1)', photo: '/areas/heat_903_11.png', topics: singlePhaseTopics('wb-map12e_243', 4, 'L2') },
  { id: 'heat_903_13', label: 'Тепловой шкаф 903 (Тепловой шкаф на кухне 1.3)', photo: '/areas/heat_903_13.png', topics: [] },
  { id: 'silain', label: 'Силайн (очень малый тепловой шкаф)', photo: '/areas/silain.png', topics: [] },
  { id: 'freezer_1', label: 'Морозильная камера 1', topics: threePhaseTopics('wb-map12e_73', 1) },
  { id: 'freezer_2', label: 'Морозильная камера 2', photo: '/areas/freezer_2.png', topics: threePhaseTopics('wb-map12e_73', 2) },
  { id: 'cold_veg', label: 'Холодильная камера (овощн.)', topics: threePhaseTopics('wb-map12e_73', 3) },
  { id: 'cold_defrost_chicken', label: 'Холодильная камера (дефрост) для курицы', topics: threePhaseTopics('wb-map12e_73', 4) },
  { id: 'coffee_1', label: 'Кофемашина 1', photo: '/areas/coffee_1.png', topics: singlePhaseTopics('wb-map12e_243', 2, 'L1') },
  { id: 'coffee_2', label: 'Кофемашина 2', photo: '/areas/coffee_2.png', topics: singlePhaseTopics('wb-map12e_243', 2, 'L2') },
  { id: 'salad_fridge', label: 'Холодильник саладет', topics: singlePhaseTopics('wb-map12e_243', 2, 'L3') },
  { id: 'boiler_1', label: 'Бойлер 1', topics: threePhaseTopics('wb-map12e_98', 1) },
  { id: 'boiler_2', label: 'Бойлер 2', topics: threePhaseTopics('wb-map12e_98', 2) },
  { id: 'boiler_3', label: 'Бойлер 3', topics: threePhaseTopics('wb-map12e_98', 3) },
  { id: 'cocktail', label: 'Коктельница', photo: '/areas/cocktail.png', topics: threePhaseTopics('wb-map12e_34', 4) },
  { id: 'heat_curtain', label: 'Тепловая завесы', photo: '/areas/heat_curtain.png', topics: threePhaseTopics('wb-map12e_243', 1) },
  { id: 'ac', label: 'Кондиционеры', photo: '/areas/ac.png', topics: threePhaseTopics('wb-map12e_98', 4) },
  {
    id: 'heaters',
    label: 'Обогреватели',
    topics: [
      'Nevinnomisk/devices/wb-map12e_24/controls/Urms L1',
      'Nevinnomisk/devices/wb-map12e_24/controls/Urms L2',
      'Nevinnomisk/devices/wb-map12e_24/controls/Urms L3',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 Irms L1',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 Irms L2',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 Irms L3',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 P L1',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 P L2',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 P L3',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 Total P',
      'Nevinnomisk/devices/wb-map12e_24/controls/Ch 4 Total AP energy'
    ]
  },
  { id: 'outdoor_light', label: 'Уличное освещение', topics: [] },
  { id: 'rest_light_group', label: 'Группа Освещение в ресторане', topics: [] },
  {
    id: 'vent_panel_1',
    label: 'ЩИТ вентиляции 1-2',
    topics: [
      'Nevinnomisk/devices/wb-map3e_74/controls/Urms L1',
      'Nevinnomisk/devices/wb-map3e_74/controls/Urms L2',
      'Nevinnomisk/devices/wb-map3e_74/controls/Urms L3',
      'Nevinnomisk/devices/wb-map3e_74/controls/Irms L1',
      'Nevinnomisk/devices/wb-map3e_74/controls/Irms L2',
      'Nevinnomisk/devices/wb-map3e_74/controls/Irms L3',
      'Nevinnomisk/devices/wb-map3e_74/controls/P L1',
      'Nevinnomisk/devices/wb-map3e_74/controls/P L2',
      'Nevinnomisk/devices/wb-map3e_74/controls/P L3',
      'Nevinnomisk/devices/wb-map3e_74/controls/Total P',
      'Nevinnomisk/devices/wb-map3e_74/controls/Total AP energy',
      'Nevinnomisk/devices/wb-map3e_74/controls/Frequency'
    ]
  },
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
  {
    id: 'hall_2',
    label: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (2)',
    topics: [
      'Nevinnomisk/devices/wb-msw-v4_96/controls/Temperature',
      'Nevinnomisk/devices/wb-msw-v4_96/controls/Humidity',
      'Nevinnomisk/devices/wb-msw-v4_96/controls/Illuminance',
      'Nevinnomisk/devices/wb-msw-v4_96/controls/CO2',
      'Nevinnomisk/devices/wb-msw-v4_96/controls/Air Quality (VOC)',
      'Nevinnomisk/devices/wb-msw-v4_96/controls/Sound Level'
    ]
  },
  { id: 'payment_zone', label: 'ЗОНА ОПЛАТЫ ЗАКАЗА', topics: [] },
  { id: 'corridor', label: 'КОРИДОР', topics: [] },
  {
    id: 'hot_shop_bread',
    label: 'ГОРЯЧИЙ ЦЕХ И ПАНИРОВОЧНАЯ',
    topics: [
      'Nevinnomisk/devices/wb-msw-v4_108/controls/Temperature',
      'Nevinnomisk/devices/wb-msw-v4_108/controls/Humidity',
      'Nevinnomisk/devices/wb-msw-v4_108/controls/Illuminance',
      'Nevinnomisk/devices/wb-msw-v4_108/controls/CO2',
      'Nevinnomisk/devices/wb-msw-v4_108/controls/Air Quality (VOC)',
      'Nevinnomisk/devices/wb-msw-v4_108/controls/Sound Level'
    ]
  },
  { id: 'distribution', label: 'РАЗДАТОЧНАЯ', topics: [] },
  { id: 'cold_defrost_chicken_caps', label: 'ХОЛОДИЛЬНАЯ КАМЕРА (ДЕФРОСТ) ДЛЯ КУРИЦЫ', topics: [] },
  {
    id: 'freezer_1_caps',
    label: 'МОРОЗИЛЬНАЯ КАМЕРА 1',
    topics: [
      'Nevinnomisk/devices/wb-m1w2_35/controls/External Sensor 1',
      'Nevinnomisk/devices/wb-m1w2_35/controls/External Sensor 2'
    ]
  },
  {
    id: 'freezer_2_caps',
    label: 'МОРОЗИЛЬНАЯ КАМЕРА 2',
    topics: [
      'Nevinnomisk/devices/wb-m1w2_63/controls/External Sensor 1',
      'Nevinnomisk/devices/wb-m1w2_63/controls/External Sensor 2'
    ]
  },
  { id: 'cold_veg_caps', label: 'ХОЛОДИЛЬНАЯ КАМЕРА (ОВОЩН.)', topics: [] },
  {
    id: 'technical_boilers',
    label: 'ТЕХНИЧЕСКОЕ ПОМЕЩЕНИЕ (БОЙЛЕРЫ)',
    topics: [
      'Nevinnomisk/devices/wb-m1w2_69/controls/External Sensor 1',
      'Nevinnomisk/devices/wb-m1w2_69/controls/External Sensor 2'
    ]
  },
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

const PHASE_COLORS = ['#ff7a59', '#ffd166', '#06d6a0']

const EQUIPMENT_COLORS = [
  '#ff7a59',
  '#ffd166',
  '#06d6a0',
  '#ff006e',
  '#8338ec',
  '#3a86ff',
  '#fb5607',
  '#ffbe0b',
  '#05ffa1',
  '#c1121f',
  '#ee9b00',
  '#ae2012',
]

function getColorForEquipmentId(equipmentId) {
  const hash = equipmentId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return EQUIPMENT_COLORS[hash % EQUIPMENT_COLORS.length]
}

const AREA_GROUPING = {
  total_kfc: {
    accentColor: '#ff7a59',
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

function pickTopicBySuffix(topics, ...suffixes) {
  return topics.find(topic => suffixes.some(suffix => topic.endsWith(suffix))) || null
}

function buildPhaseLines(topics, metricTail, labelPrefix = 'Линия') {
  const phases = ['L1', 'L2', 'L3']
  return phases
    .map(phase => {
      const topic = pickTopicBySuffix(topics, `${metricTail} ${phase}`)
      if (!topic) return null
      return { topic, label: `${labelPrefix} ${phase}` }
    })
    .filter(Boolean)
}

function buildGenericElectricGrouping(area) {
  if (!area?.topics?.length) return null

  const topics = area.topics

  const voltageLines = buildPhaseLines(topics, 'Urms')
  const currentLines = buildPhaseLines(topics, 'Irms')
  const powerLines = buildPhaseLines(topics, 'P')

  const groups = []
  if (voltageLines.length) {
    groups.push({
      id: `${area.id}_voltage_phases`,
      label: 'Напряжение по фазам',
      unit: 'В',
      lines: voltageLines,
    })
  }
  if (currentLines.length) {
    groups.push({
      id: `${area.id}_current_phases`,
      label: 'Ток по фазам',
      unit: 'А',
      lines: currentLines,
    })
  }
  if (powerLines.length) {
    groups.push({
      id: `${area.id}_power_phases`,
      label: 'Мощность по фазам',
      unit: 'кВт',
      lines: powerLines,
    })
  }

  if (!groups.length) return null

  const totalPower =
    pickTopicBySuffix(topics, 'Total P') ||
    powerLines[0]?.topic ||
    null
  const totalEnergy =
    pickTopicBySuffix(topics, 'Total AP energy', 'Total A energy', 'AP energy L1', 'AP energy L2', 'AP energy L3') ||
    null
  const frequencyTopic = pickTopicBySuffix(topics, 'Frequency')

  const accentColor = getColorForEquipmentId(area.id)

  return {
    accentColor,
    phaseColors: PHASE_COLORS,
    pinned: [totalPower, totalEnergy].filter(Boolean),
    groups,
    trailing: [frequencyTopic].filter(Boolean),
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

function parseBackendTimestamp(timestamp) {
  if (!timestamp) {
    return null
  }

  const raw = String(timestamp)
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw)
  const iso = hasTimezone ? raw : `${raw}Z`
  const parsed = new Date(iso)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '—'
  }

  const d = parseBackendTimestamp(timestamp)
  if (!d) {
    return '—'
  }

  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateRangeCompact(from, to) {
  const fromDate = parseBackendTimestamp(from)
  const toDate = parseBackendTimestamp(to)
  if (!fromDate || !toDate) return 'Период: —'

  const fromText = fromDate.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const toText = toDate.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `Период: ${fromText} - ${toText}`
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

function HistoryChart({ points, chartId, windowSize, accentColor = '#ff7a59' }) {
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

  const times = points
    .map(p => parseBackendTimestamp(p.timestamp)?.getTime() ?? Number.NaN)
    .filter(t => !Number.isNaN(t))
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const timeRange = maxTime - minTime || 1

  const chartPoints = points.map(point => {
    const t = parseBackendTimestamp(point.timestamp)?.getTime() ?? minTime
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
    .map(p => parseBackendTimestamp(p.timestamp)?.getTime() ?? Number.NaN)
    .filter(t => !Number.isNaN(t))

  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const valRange = maxVal - minVal || 1
  const minTime = Math.min(...allTimes)
  const maxTime = Math.max(...allTimes)
  const timeRange = maxTime - minTime || 1

  function mapXY(point) {
    const t = parseBackendTimestamp(point.timestamp)?.getTime() ?? minTime
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

function formatEnergyValue(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

function SingleTopicCard({ item, loading, windowSize, accentColor = '#ff7a59' }) {
  const values = item.points.map(p => p.value)
  const latest = values.length ? values[values.length - 1] : 0
  const recentPoints = [...item.points].slice(-6).reverse()
  const isEnergyMetric = /energy/i.test(item.topic) || /энерг/i.test(item.label)

  const energyRows = [
    { key: 'today', label: 'Сегодня',   period: item.energySummary?.today },
  ]

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
        {loading && <span>Загрузка...</span>}
      </div>
      <div className="history-stats mini">
        {!isEnergyMetric && (
          <article className="history-stat-card">
            <span>Последнее значение</span>
            <strong>{formatMetricValue(latest)} {item.unit}</strong>
          </article>
        )}
        {isEnergyMetric && energyRows.map(row => {
          const period = row.period
          const hasValue = typeof period?.value === 'number'
          return (
            <article key={row.key} className="history-stat-card">
              <span>{row.label}</span>
              {hasValue
                ? <strong>{formatEnergyValue(period.value)} {item.unit || 'кВт·ч'}</strong>
                : <strong className="history-energy-nodata">Нет данных</strong>
              }
              {hasValue && (
                <small className="history-energy-range">
                  {formatDateRangeCompact(period.from, period.to)}
                </small>
              )}
            </article>
          )
        })}
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

function downloadCSV(series, selectedArea, windowSize) {
  if (!series.length) return

  const formatTimestamp = (value) => {
    const d = parseBackendTimestamp(value)
    if (!d) return String(value ?? '')

    const ms = d.getMilliseconds()
    if (ms >= 500) {
      d.setSeconds(d.getSeconds() + 1)
    }

    const date = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-')
    const time = [
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      String(d.getSeconds()).padStart(2, '0')
    ].join(':')

    return `${date} ${time}`
  }

  const rows = [['Timestamp', 'Metric', 'Topic', 'Value', 'Unit']]
  for (const item of series) {
    for (const point of [...item.points].reverse()) {
      rows.push([
        formatTimestamp(point.timestamp),
        item.label,
        item.topic,
        point.value,
        item.unit,
      ])
    }
  }
  const csv = rows
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const metricNameForFile = String(selectedArea?.label ?? 'metric')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  a.href = url
  a.download = `${metricNameForFile || 'metric'}_${windowSize}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
              points,
              energySummary: data.energySummary || null,
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

  const grouping = AREA_GROUPING[selectedAreaId] || buildGenericElectricGrouping(selectedArea)
  const seriesByTopic = Object.fromEntries(series.map(s => [s.topic, s]))
  const groupedTopics = grouping
    ? new Set([
        ...grouping.pinned,
        ...(grouping.trailing || []),
        ...grouping.groups.flatMap(group => group.lines.map(line => line.topic)),
      ])
    : new Set()
  const remainingSeries = series.filter(item => !groupedTopics.has(item.topic))

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
              <div className="history-metric-row">
                <select value={selectedAreaId} onChange={event => setSelectedAreaId(event.target.value)}>
                  {AREA_OPTIONS.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="history-download-btn"
                  title="Скачать данные в CSV"
                  disabled={loading || !series.some(s => s.points.length > 0)}
                  onClick={() => downloadCSV(series, selectedArea, windowSize)}
                >
                  ↓ CSV
                </button>
              </div>
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
                      ? <SingleTopicCard key={topic} item={item} loading={loading} windowSize={windowSize} accentColor={grouping.accentColor || '#ff7a59'} />
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
                  {(grouping.trailing || []).map(topic => {
                    const item = seriesByTopic[topic]
                    return item
                      ? <SingleTopicCard key={topic} item={item} loading={loading} windowSize={windowSize} accentColor={grouping.accentColor || '#ff7a59'} />
                      : null
                  })}
                  {remainingSeries.map(item => (
                    <SingleTopicCard key={item.topic} item={item} loading={loading} windowSize={windowSize} accentColor={grouping.accentColor || '#ff7a59'} />
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
