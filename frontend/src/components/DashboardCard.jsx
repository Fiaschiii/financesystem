import Icon from './Icon.jsx'

// Cartão de resumo reutilizável.
// - tone: "negative" (vermelho) ou "positive" (destaque verde, usado no saldo)
// - progress: 0–100+, desenha uma barrinha (ex.: % do salário gasto)
function DashboardCard({ label, value, icon, tone, progress, children }) {
  return (
    <div className={`dashboard-card${tone ? ` dashboard-card--${tone}` : ''}`}>
      <span className="dashboard-card__label">
        {icon && (
          <span className="dashboard-card__icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        {label}
      </span>
      <strong className="dashboard-card__value">{value}</strong>
      {progress !== undefined && (
        <span className="dashboard-card__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </span>
      )}
      {children}
    </div>
  )
}

export default DashboardCard
