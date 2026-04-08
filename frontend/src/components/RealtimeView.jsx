import { MetricCard } from './MetricCard'
import '../styles/RealtimeView.css'

export function RealtimeView({ metrics, values, histories }) {
  const groupOrder = [
    'total_kfc',
    'f100_left',
    'f100_right',
    'fastron_1_left',
    'fastron_2_mid',
    'fastron_3_right',
    'eee_142_right',
    'eee_142_left',
    'cocktail',
    'freezer_1',
    'freezer_2',
    'cold_veg',
    'cold_defrost_chicken',
    'boiler_1',
    'boiler_2',
    'boiler_3',
    'ac',
    'heat_curtain',
    'coffee_1',
    'coffee_2',
    'salad_fridge',
    'heat_cab',
    'follett_1050',
    'toaster_vertical',
    'toaster_horizontal',
    'heat_903_12',
    'heat_903_11',
    'hall_1',
    'weather',
  ]
  const groupLabels = {
    total_kfc: 'Общая мощность · KFC',
    f100_left: 'F100 Левая (Закрытые жаровни:1.1)',
    f100_right: 'F100 Правая (Закрытые жаровни:1.2)',
    fastron_1_left: 'FASTRON_1 Левая (Открытые жаровни:2.1)',
    fastron_2_mid: 'FASTRON_2 Средная (Открытые жаровни:2.2)',
    fastron_3_right: 'FASTRON_3 Правая (Открытые жаровни:2.3)',
    eee_142_right: 'Жаровня EEE 142 правая (Фритюрница на кухне картофеля фри:3.2)',
    eee_142_left: 'Жаровня EEE 142 левая (Фритюрница на кухне картофеля фри:3.1)',
    cocktail: 'Коктельница',
    freezer_1: 'Морозильная камера 1',
    freezer_2: 'Морозильная камера 2',
    cold_veg: 'Холодильная камера (овощн.)',
    cold_defrost_chicken: 'Холодильная камера (дефрост) для курицы',
    boiler_1: 'Бойлер 1',
    boiler_2: 'Бойлер 2',
    boiler_3: 'Бойлер 3',
    ac: 'Кондиционеры',
    heat_curtain: 'Тепловая завесы',
    coffee_1: 'Кофемашина 1',
    coffee_2: 'Кофемашина 2',
    salad_fridge: 'Холодильник саладет',
    heat_cab: 'ТЕПЛОВОЙ ШКАФ',
    follett_1050: 'Шкаф тепловой FOLLETT 1050BK (Тепловая витрина)',
    toaster_vertical: 'ТОСТЕР ВЕРТИКАЛЬНЫЙ',
    toaster_horizontal: 'ТОСТЕР ГОРИЗОНТАЛЬНЫЙ',
    heat_903_12: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.2)',
    heat_903_11: 'Тепловой шкаф 903 (Тепловые шкафы на панировке:1.1)',
    hall_1: 'ЗАЛ ДЛЯ ПОСЕТИТЕЛЕЙ (1)',
    weather: 'Погода',
  }

  const ordered = groupOrder.map(groupId => ({
    id: groupId,
    label: groupLabels[groupId],
    metrics: metrics.filter(m => m.group === groupId)
  })).filter(g => g.metrics.length > 0)

  const remaining = metrics
    .filter(m => !groupOrder.includes(m.group))
    .reduce((acc, metric) => {
      if (!acc[metric.group]) {
        acc[metric.group] = {
          id: metric.group,
          label: metric.groupLabel || metric.group,
          metrics: [],
        }
      }
      acc[metric.group].metrics.push(metric)
      return acc
    }, {})

  const groups = [...ordered, ...Object.values(remaining)]

  return (
    <div className="realtime-view">
      <div className="groups-grid">
        {groups.map(group => (
          <section
            key={group.id}
            className={`metric-group electric-card group-${group.id.replace('_', '-')}`}
          >
            <div className="electric-frame" aria-hidden="true">
              <div className="border-outer">
                <div className="main-card-layer"></div>
              </div>
              <div className="glow-layer-1"></div>
              <div className="glow-layer-2"></div>
              <div className="overlay-1"></div>
              <div className="overlay-2"></div>
              <div className="background-glow"></div>
            </div>

            <h2 className="group-title">{group.label}</h2>
            <div className="metrics-row">
              {group.metrics.map(metric => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  value={values[metric.topic]?.value}
                  history={histories[metric.topic]}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
