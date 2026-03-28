import './ConnectionStatus.css'

export function ConnectionStatus({ connected, broker }) {
  return (
    <div className={`connection-badge ${connected ? 'live' : 'offline'}`}>
      <span className={`pulse-dot ${connected ? 'live' : 'offline'}`}></span>
      <span className="connection-text">
        {connected ? `🟢 Подключено (${broker})` : '🔴 Переподключение...'}
      </span>
    </div>
  )
}
