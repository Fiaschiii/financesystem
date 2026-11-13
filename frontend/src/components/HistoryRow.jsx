import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../hooks/useToast.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import SalaryForm from './SalaryForm.jsx'
import ExpenseForm from './ExpenseForm.jsx'
import ExpenseList from './ExpenseList.jsx'
import { SkeletonRows } from './Skeleton.jsx'
import { GraphIcon } from '@primer/octicons-react'
import Icon from './Icon.jsx'
import { formatBRL, subtractMoney } from '../utils/currency.js'
import { formatMonthYear, monthRange, toMonthParam } from '../utils/date.js'
import { useI18n } from '../i18n/index.jsx'

// Uma linha do Histórico. Clicar no mês expande os gastos daquele período
// (criar/editar/excluir, como no Dashboard); o salário tem edição inline.
// Só busca os gastos do mês quando a linha é expandida.
function HistoryRow({ item, categories, onSaveSalary, onChanged }) {
  const [editingSalary, setEditingSalary] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [addingExpense, setAddingExpense] = useState(false)
  const toast = useToast()
  const { t } = useI18n()

  const expensesState = useExpenses(expanded ? item.month : null, expanded ? item.year : null)

  const monthLabel = formatMonthYear(item.month, item.year)
  const dateRange = monthRange(item.month, item.year)
  const balance = subtractMoney(item.salary, item.totalSpent)

  async function handleSaveSalary(salary) {
    await onSaveSalary(item.id, salary)
    setEditingSalary(false)
    toast(t('toast.salarySaved'))
  }

  async function handleAddExpense(values) {
    await expensesState.addExpense(values)
    onChanged()
    setAddingExpense(false)
    toast(t('toast.expenseAdded'))
  }

  async function handleUpdateExpense(id, values) {
    await expensesState.updateExpense(id, values)
    onChanged()
  }

  async function handleDeleteExpense(id) {
    await expensesState.deleteExpense(id)
    onChanged()
  }

  return (
    <>
      <tr className="history-row">
        <td className="cell-month">
          <div className="history-month">
            <button
              type="button"
              className="history-month-toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              <span aria-hidden="true">{expanded ? '▾' : '▸'}</span> {monthLabel}
            </button>
            <Link className="action-button history-month__link" to={`/?mes=${toMonthParam(item.month, item.year)}`}>
              <GraphIcon size={14} /> {t('history.viewSummary')}
            </Link>
          </div>
        </td>
        <td className="num cell-salary" data-label={t('history.salary')}>
          <div className="history-salary">
            <span>{formatBRL(item.salary)}</span>
            {!editingSalary && (
              <button type="button" className="action-button" onClick={() => setEditingSalary(true)}>
                {t('common.edit')}
              </button>
            )}
          </div>
        </td>
        <td className="num cell-spent" data-label={t('history.spent')}>{formatBRL(item.totalSpent)}</td>
        <td className={`num cell-balance${balance < 0 ? ' num--negative' : ''}`} data-label={t('history.balance')}>
          {formatBRL(balance)}
        </td>
      </tr>

      {editingSalary && (
        <tr>
          <td colSpan={4} className="cell-full">
            <SalaryForm
              monthLabel={monthLabel}
              initialValue={item.salary}
              onSave={handleSaveSalary}
              onCancel={() => setEditingSalary(false)}
            />
          </td>
        </tr>
      )}

      {expanded && (
        <tr>
          <td colSpan={4} className="cell-full">
            {expensesState.loading && <SkeletonRows count={3} />}
            {expensesState.error && <p className="status status--error">{expensesState.error}</p>}

            {!expensesState.loading && !expensesState.error && (
              <>
                <div className="section-header">
                  <h3>{t('history.expensesOf', { month: monthLabel })}</h3>
                  {!addingExpense && (
                    <button type="button" className="button" onClick={() => setAddingExpense(true)}>
                      <Icon name="plus" size={16} /> {t('dashboard.addExpense')}
                    </button>
                  )}
                </div>

                {addingExpense && (
                  <ExpenseForm
                    categories={categories}
                    dateRange={dateRange}
                    defaultDate={dateRange.min}
                    monthLabel={monthLabel}
                    onSave={handleAddExpense}
                    onCancel={() => setAddingExpense(false)}
                  />
                )}

                <ExpenseList
                  expenses={expensesState.expenses}
                  categories={categories}
                  dateRange={dateRange}
                  monthLabel={monthLabel}
                  onUpdate={handleUpdateExpense}
                  onDelete={handleDeleteExpense}
                />
              </>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default HistoryRow
