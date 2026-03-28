import '../styles/HistoricalView.css'

export function HistoricalView() {
  return (
    <div className="historical-view">
      <div className="historical-placeholder">
        <div className="placeholder-icon">📊</div>
        <h2>Исторические данные</h2>
        <p>Раздел для анализа исторических данных находится в разработке.</p>
        <p>Здесь будут доступны графики, тренды и аналитика по всем метрикам за выбранный период.</p>
        
        <div className="coming-features">
          <h3>Планируемые функции:</h3>
          <ul>
            <li>📈 Графики временных рядов для каждой метрики</li>
            <li>📅 Выбор периода анализа</li>
            <li>🔍 Детальный поиск и фильтрация данных</li>
            <li>📊 Сравнение показателей между периодами</li>
            <li>💾 Экспорт данных в CSV/Excel</li>
            <li>⚡ Обнаружение аномалий и предупреждения</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
