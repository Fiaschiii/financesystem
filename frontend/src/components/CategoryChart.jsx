import { formatBRL, sumMoney } from '../utils/currency.js'
import { getLocale, useI18n } from '../i18n/index.jsx'

// Agrupa os gastos do mês por categoria, do maior total para o menor.
function totalsByCategory(expenses, noCategory) {
  const groups = new Map()
  for (const expense of expenses) {
    const name = expense.category?.name ?? noCategory
    const amounts = groups.get(name) ?? []
    amounts.push(expense.amount)
    groups.set(name, amounts)
  }
  return [...groups.entries()]
    .map(([name, amounts]) => ({ name, total: sumMoney(amounts) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, getLocale()))
}

// Gráfico de barras horizontais: quanto foi gasto em cada categoria no mês.
// Uma série só (sem legenda); cada barra traz o valor e a % do total ao lado.
function CategoryChart({ expenses }) {
  const { t } = useI18n()
  const rows = totalsByCategory(expenses, t('chart.noCategory'))
  const grandTotal = sumMoney(rows.map((row) => row.total))

  if (rows.length === 0 || grandTotal <= 0) {
    return <p className="empty-state">{t('chart.noExpenses')}</p>
  }

  const max = rows[0].total

  return (
    <ul className="category-chart" aria-label={t('chart.byCategory')}>
      {rows.map((row) => {
        const percent = Math.round((row.total / grandTotal) * 100)
        return (
          <li key={row.name} className="category-chart__row">
            <span className="category-chart__name">{row.name}</span>
            <span className="category-chart__track" aria-hidden="true">
              <span
                className="category-chart__bar"
                style={{ width: `${Math.max(1, (row.total / max) * 100)}%` }}
                title={t('chart.barTitle', { name: row.name, value: formatBRL(row.total), percent })}
              />
            </span>
            <span className="category-chart__value">
              {formatBRL(row.total)} <small>{percent}%</small>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default CategoryChart
