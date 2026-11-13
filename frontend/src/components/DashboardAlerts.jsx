import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile.jsx'
import { useI18n } from '../i18n/index.jsx'
import Icon from './Icon.jsx'

// Caixinha a partir de quanto do limite já merece aviso.
export const BUDGET_WARNING_RATIO = 0.8

// Separa as caixinhas que merecem aviso: estouradas (passaram do limite) e
// perto do limite (80% ou mais, sem passar).
export function budgetAlerts(budgets) {
  const over = []
  const near = []
  for (const budget of budgets) {
    const limit = Number(budget.limit_amount)
    const spent = Number(budget.spent)
    if (spent > limit) over.push(budget)
    else if (limit > 0 && spent >= limit * BUDGET_WARNING_RATIO) near.push({ ...budget, percent: Math.round((spent / limit) * 100) })
  }
  return { over, near }
}

// Avisos no topo do Resumo. Cada tipo pode ser desligado em
// Minha conta > Preferências.
// - salaryMissing: o mês existe, mas o salário está zerado (o primeiro gasto
//   do mês foi lançado antes do salário). Sem registro nenhum, o próprio
//   Resumo já mostra o formulário do salário.
function DashboardAlerts({ budgets, salaryMissing, monthLabel, onInformSalary }) {
  const { t } = useI18n()
  const { notifications, mfaEnabled, isDemo } = useProfile()

  const { over, near } = notifications.budget ? budgetAlerts(budgets) : { over: [], near: [] }
  const items = []

  if (over.length > 0) {
    items.push(
      <p key="over" className="status status--error status--with-icon">
        <Icon name="alert" />
        <span>{t('alerts.budgetOver', { names: over.map((budget) => budget.category.name).join(', ') })}</span>
      </p>
    )
  }
  if (near.length > 0) {
    items.push(
      <p key="near" className="status status--warning status--with-icon">
        <Icon name="alert" />
        <span>
          {t('alerts.budgetNear', {
            names: near.map((budget) => `${budget.category.name} (${budget.percent}%)`).join(', '),
          })}
        </span>
      </p>
    )
  }
  if (notifications.salary && salaryMissing) {
    items.push(
      <p key="salary" className="status status--warning status--with-icon">
        <Icon name="wallet" />
        <span>
          {t('alerts.missingSalary', { month: monthLabel })}{' '}
          <button type="button" className="link-button" onClick={onInformSalary}>
            {t('alerts.missingSalaryAction')}
          </button>
        </span>
      </p>
    )
  }
  // Na conta de demonstração o MFA fica travado: o lembrete só atrapalharia.
  if (notifications.mfa && !mfaEnabled && !isDemo) {
    items.push(
      <p key="mfa" className="status status--pending status--with-icon">
        <Icon name="shield" />
        <span>
          {t('alerts.mfa')} <Link to="/profile?aba=seguranca">{t('alerts.mfaAction')}</Link>
        </span>
      </p>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="dashboard-alerts" aria-label={t('alerts.label')}>
      {items}
      <Link className="dashboard-alerts__manage" to="/profile?aba=preferencias">
        {t('alerts.manage')}
      </Link>
    </section>
  )
}

export default DashboardAlerts
