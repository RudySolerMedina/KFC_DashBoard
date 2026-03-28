import { MetricCard } from './MetricCard'
import '../styles/RealtimeView.css'

export function RealtimeView({ metrics, values, histories }) {
  const groupOrder = ['total', 'microclimate', 'voltages', 'currents', 'power', 'power_factor']
  const groupLabels = {
    microclimate: 'Микроклимат в ресторане KFC',
    voltages: 'Общее напряжение по фазам · Ресторан KFC',
    currents: 'Общий ток по фазам · Ресторан KFC',
    power: 'Общая мощность по фазам · Ресторан KFC',
    power_factor: 'Общий коэффициент мощности · Ресторан KFC',
    total: 'Общая нагрузка · Ресторан KFC'
  }

  const groups = groupOrder.map(groupId => ({
    id: groupId,
    label: groupLabels[groupId],
    metrics: metrics.filter(m => m.group === groupId)
  })).filter(g => g.metrics.length > 0)

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
