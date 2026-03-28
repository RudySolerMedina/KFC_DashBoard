import { useState, useEffect, useRef } from 'react'
import { MetricCard } from './components/MetricCard'
import { ConnectionStatus } from './components/ConnectionStatus'
import './App.css'

function App() {
  const [metrics, setMetrics] = useState([])
  const [values, setValues] = useState({})
  const [connected, setConnected] = useState(false)
  const [broker, setBroker] = useState('')
  const wsRef = useRef(null)

  useEffect(() => {
    // Fetch initial metrics
    fetch('http://127.0.0.1:8080/api/metrics')
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics)
        setValues(data.values)
      })
      .catch(e => console.error('API error:', e))

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://127.0.0.1:8080/ws`)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        
        if (payload.type === 'bootstrap') {
          setBroker(payload.broker)
          setMetrics(payload.metrics)
          setValues(payload.values)
        }
        
        if (payload.type === 'metric') {
          setValues(prev => ({
            ...prev,
            [payload.topic]: { value: payload.value, ts: payload.ts }
          }))
        }
      } catch (error) {
        console.error('WebSocket parse error:', error)
      }
    }

    ws.onerror = () => {
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
    }

    wsRef.current = ws

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const groupOrder = ['voltages', 'currents', 'power', 'power_factor', 'total']
  const groupLabels = {
    voltages: 'Напряжение по фазам · KFC',
    currents: 'Ток по фазам · KFC',
    power: 'Мощность по фазам · KFC',
    power_factor: 'Коэффициент мощности · KFC',
    total: 'Общая нагрузка · KFC'
  }

  const groups = groupOrder.map(groupId => ({
    id: groupId,
    label: groupLabels[groupId],
    metrics: metrics.filter(m => m.group === groupId)
  })).filter(g => g.metrics.length > 0)

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>⚡ Электропотребление KFC</h1>
            <p className="subtitle">Невинномысск · Счётчик CE303 · Трёхфазный многотарифный</p>
          </div>
          <ConnectionStatus connected={connected} broker={broker} />
        </div>
      </header>

      <main className="container">
        <div className="groups-grid">
          {groups.map(group => (
            <section key={group.id} className="metric-group electric-border">
              <h2 className="group-title">{group.label}</h2>
              <div className="metrics-row">
                {group.metrics.map(metric => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    value={values[metric.topic]?.value}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
