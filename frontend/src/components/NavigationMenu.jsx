import '../styles/NavigationMenu.css'

export function NavigationMenu({ activeView, onViewChange }) {
  return (
    <nav className="navigation-menu">
      <button
        className={`nav-button ${activeView === 'realtime' ? 'active' : ''}`}
        onClick={() => onViewChange('realtime')}
        title="Данные в реальном времени"
      >
        <span className="nav-icon">⚡</span>
        <span className="nav-label">Реальное<br/>время</span>
      </button>

      <button
        className={`nav-button ${activeView === 'historical' ? 'active' : ''}`}
        onClick={() => onViewChange('historical')}
        title="Исторические данные"
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">История<br/>данных</span>
      </button>

      <button
        className={`nav-button ${activeView === 'analytics' ? 'active' : ''}`}
        onClick={() => onViewChange('analytics')}
        title="Аналитика и показатели эффективности"
      >
        <span className="nav-icon">📈</span>
        <span className="nav-label">Аналити<br/>ка</span>
      </button>
    </nav>
  )
}
