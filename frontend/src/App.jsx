import { useState, useEffect, useRef } from 'react'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RealtimeView } from './components/RealtimeView'
import { HistoricalView } from './components/HistoricalView'
import { AnalyticsView } from './components/AnalyticsView'
import { NavigationMenu } from './components/NavigationMenu'
import './App.css'
import './styles/NavigationMenu.css'
import './styles/RealtimeView.css'
import './styles/HistoricalView.css'

const MAX_HISTORY = 60
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080'
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? API_BASE_URL.replace(/^http/i, 'ws')

function App() {
  const [metrics, setMetrics] = useState([])
  const [values, setValues] = useState({})
  const [histories, setHistories] = useState({})
  const [connected, setConnected] = useState(false)
  const [broker, setBroker] = useState('')
  const [activeView, setActiveView] = useState('realtime')
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const shouldReconnectRef = useRef(true)

  useEffect(() => {
    shouldReconnectRef.current = true

    fetch(`${API_BASE_URL}/api/metrics`)
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics || [])
        setValues(data.values || {})
        setBroker(data.broker || '')
      })
      .catch(e => console.error('[API] error:', e))

    const connectWS = () => {
      if (!shouldReconnectRef.current) return

      const ws = new WebSocket(`${WS_BASE_URL}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] connected')
        setConnected(true)
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          console.log('[WS] message received:', msg.type, msg.topic || '')

          if (msg.type === 'bootstrap') {
            console.log('[WS] bootstrap received, metrics:', msg.metrics?.length)
            setMetrics(msg.metrics || [])
            setBroker(msg.broker || '')

            const newValues = {}
            const newHistories = {}
            Object.entries(msg.values || {}).forEach(([topic, val]) => {
              const num = typeof val === 'number' ? val : (val?.value ?? 0)
              newValues[topic] = { value: num, ts: val?.ts ?? Date.now() / 1000 }
              newHistories[topic] = [num]
            })
            setValues(newValues)
            setHistories(newHistories)
            console.log('[WS] bootstrap processed, loaded', Object.keys(newValues).length, 'topics')
          }

          if (msg.type === 'metric') {
            const val = typeof msg.value === 'number' ? msg.value : 0
            console.log('[WS] metric update:', msg.topic, '=', val)
            setValues(prev => ({
              ...prev,
              [msg.topic]: { value: val, ts: msg.ts ?? Date.now() / 1000 }
            }))
            setHistories(prev => ({
              ...prev,
              [msg.topic]: [...(prev[msg.topic] || []), val].slice(-MAX_HISTORY)
            }))
          }
        } catch (err) {
          console.error('[WS] parse error:', err)
        }
      }

      ws.onerror = () => {
        console.error('[WS] error')
        setConnected(false)
      }

      ws.onclose = () => {
        console.log('[WS] closed')
        setConnected(false)
        if (shouldReconnectRef.current) {
          reconnectTimerRef.current = setTimeout(connectWS, 2000)
        }
      }
    }

    connectWS()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return (
    <div className="app">
      <svg className="electric-filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="turbulent-displace" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise3" seed="2" />
            <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
              <animate attributeName="dx" values="490; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise4" seed="2" />
            <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
              <animate attributeName="dx" values="0; -490" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
            <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </defs>
      </svg>

      <header className="header">
        <div className="header-content">
          <div>
            <h1>⚡ Электропотребление KFC</h1>
            <p className="subtitle">Невинномысск · Счётчик CE303 · Трёхфазный многотарифный</p>
          </div>
          <ConnectionStatus connected={connected} broker={broker} />
        </div>
      </header>

      <NavigationMenu activeView={activeView} onViewChange={setActiveView} />

      <main className="container">
        {activeView === 'realtime' && (
          <RealtimeView metrics={metrics} values={values} histories={histories} />
        )}
        {activeView === 'historical' && (
          <HistoricalView apiBaseUrl={API_BASE_URL} metrics={metrics} />
        )}
        {activeView === 'analytics' && (
          <AnalyticsView />
        )}
      </main>
    </div>
  )
}

export default App
