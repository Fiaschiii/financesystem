import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFinance } from '../hooks/useFinance.js'
import { useCategories } from '../hooks/useCategories.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { useBudgets } from '../hooks/useBudgets.js'
import { useToast } from '../hooks/useToast.jsx'
import { useProfile } from '../hooks/useProfile.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { formatBRL, sumMoney, subtractMoney } from '../utils/currency.js'
import { resolvePanels } from '../utils/dashboardPanels.js'
import { formatMonthYear, monthRange, toISODate, parseMonthParam, toMonthParam } from '../utils/date.js'
import DashboardCard from '../components/DashboardCard.jsx'
import SalaryForm from '../components/SalaryForm.jsx'
import ExpenseForm from '../components/ExpenseForm.jsx'
import ExpenseList from '../components/ExpenseList.jsx'
import BudgetForm from '../components/BudgetForm.jsx'
import BudgetList from '../components/BudgetList.jsx'
import CategoryChart from '../components/CategoryChart.jsx'
import MonthPicker from '../components/MonthPicker.jsx'
import Icon from '../components/Icon.jsx'
import DashboardAlerts from '../components/DashboardAlerts.jsx'
import { useI18n } from '../i18n/index.jsx'
import { SkeletonCards, SkeletonRows, LoadingLabel } from '../components/Skeleton.jsx'

// Página "Resumo": o mês exibido vem da URL (?mes=2026-10); sem ela, é o mês
// atual. Assim, recarregar a página ou voltar do Histórico mantém o mês.
function Dashboard() {
  usePageTitle('dashboard.pageTitle')
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriesState = useCategories()

  const now = new Date()
  const current = { month: now.getMonth() + 1, year: now.getFullYear() }
  const selected = parseMonthParam(searchParams.get('mes')) ?? current

  function changeMonth({ month, year }) {
    const isCurrent = month === current.month && year === current.year
    setSearchParams(isCurrent ? {} : { mes: toMonthParam(month, year) })
  }

  return (
    // A key faz o resumo "nascer de novo" a cada mês: formulários abertos
    // fecham e os dados do mês anterior não aparecem nem por um instante.
    <MonthSummary
      key={toMonthParam(selected.month, selected.year)}
      month={selected.month}
      year={selected.year}
      current={current}
      onChangeMonth={changeMonth}
      categoriesState={categoriesState}
    />
  )
}

function MonthSummary({ month, year, current, onChangeMonth, categoriesState }) {
  const toast = useToast()
  const { t } = useI18n()
  const financeState = useFinance(month, year)
  const { finance } = financeState
  const expensesState = useExpenses(month, year)
  const budgetsState = useBudgets(month, year)
  const { profile } = useProfile()
  const panels = resolvePanels(profile?.dashboard_panels)

  const [editingSalary, setEditingSalary] = useState(false)
  const [addingExpense, setAddingExpense] = useState(false)
  const [addingBudget, setAddingBudget] = useState(false)

  const error =
    financeState.error || categoriesState.error || expensesState.error || budgetsState.error
  const loading =
    !error &&
    (financeState.loading || categoriesState.loading || expensesState.loading || budgetsState.loading)
  const ready = !error && !loading
  useRouteReady(!loading)

  const monthLabel = formatMonthYear(month, year)
  const dateRange = monthRange(month, year)

  // Data sugerida no formulário: hoje, se estiver dentro do mês exibido.
  const today = toISODate()
  const defaultDate = today >= dateRange.min && today <= dateRange.max ? today : dateRange.min

  const totalSpent = sumMoney(expensesState.expenses.map((expense) => expense.amount))
  const balance = subtractMoney(finance?.salary ?? 0, totalSpent)
  const hasCategories = categoriesState.categories.length > 0
  const categoriesWithoutBudget = categoriesState.categories.filter(
    (category) => !budgetsState.budgets.some((budget) => budget.category_id === category.id)
  )

  const fixedTotal = sumMoney(
    expensesState.expenses.filter((expense) => expense.type === 'fixo').map((expense) => expense.amount)
  )
  const variableTotal = sumMoney(
    expensesState.expenses.filter((expense) => expense.type === 'variavel').map((expense) => expense.amount)
  )
  const salary = Number(finance?.salary ?? 0)
  const spentPercent = salary > 0 ? Math.round((totalSpent / salary) * 100) : null
  const isCurrentMonth = month === current.month && year === current.year

  // Conteúdo de cada painel; a ordem e o ícone vêm do perfil (Configurações).
  const cards = {
    salary: {
      value: formatBRL(finance?.salary ?? 0),
      children: !editingSalary && (
        <button
          type="button"
          className="action-button"
          aria-label={salary === 0 ? undefined : t('dashboard.editSalary')}
          onClick={() => setEditingSalary(true)}
        >
          {salary === 0 ? t('dashboard.informSalary') : t('common.edit')}
        </button>
      ),
    },
    spent: { value: formatBRL(totalSpent) },
    balance: { value: formatBRL(balance), tone: balance < 0 ? 'negative' : 'positive' },
    fixed: { value: formatBRL(fixedTotal) },
    variable: { value: formatBRL(variableTotal) },
    // Sem salário, não há porcentagem para mostrar.
    percent: spentPercent !== null && {
      value: `${spentPercent}%`,
      tone: spentPercent > 100 ? 'negative' : undefined,
      progress: spentPercent,
    },
  }

  function reloadAll() {
    financeState.reload()
    categoriesState.reload()
    expensesState.reload()
    budgetsState.reload()
  }

  async function handleSaveSalary(value) {
    await financeState.saveSalary(value)
    setEditingSalary(false)
    toast(t('toast.salarySaved'))
  }

  async function handleAddExpense(values) {
    await expensesState.addExpense(values)
    // Se o mês ainda não tinha registro, o backend criou um com salário 0:
    // atualiza o estado para os cartões aparecerem.
    if (!finance) {
      await financeState.reload({ silent: true })
    }
    setAddingExpense(false)
    toast(t('toast.expenseAdded'))
  }

  async function handleAddBudget(values) {
    await budgetsState.addBudget(values)
    setAddingBudget(false)
    toast(t('toast.budgetCreated'))
  }

  return (
    <section className="page page--wide">
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
        <MonthPicker month={month} year={year} current={current} onChange={onChangeMonth} />
      </div>

      {loading && (
        <>
          <LoadingLabel />
          <SkeletonCards count={6} />
          <SkeletonRows />
        </>
      )}

      {error && (
        <div className="dashboard-panel">
          <p className="status status--error">{error}</p>
          <button type="button" className="button button--ghost" onClick={reloadAll}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {ready && (
        <>
          <DashboardAlerts
            budgets={budgetsState.budgets}
            salaryMissing={Boolean(finance) && salary === 0 && isCurrentMonth && !editingSalary}
            monthLabel={monthLabel}
            onInformSalary={() => setEditingSalary(true)}
          />

          {(editingSalary || !finance) && (
            <div className="dashboard-panel dashboard-panel--highlight">
              <h2 className="dashboard-panel__title">
                {finance ? t('dashboard.editSalary') : t('dashboard.noSalary', { month: monthLabel })}
              </h2>
              <SalaryForm
                monthLabel={monthLabel}
                initialValue={finance?.salary ?? null}
                onSave={handleSaveSalary}
                onCancel={finance ? () => setEditingSalary(false) : undefined}
              />
            </div>
          )}

          {finance && (
            <div className="dashboard-cards">
              {panels.map((panel) => {
                const card = cards[panel.id]
                if (!card) return null
                const { children, ...props } = card
                return (
                  <DashboardCard key={panel.id} label={t(panel.labelKey)} icon={panel.icon} {...props}>
                    {children}
                  </DashboardCard>
                )
              })}
            </div>
          )}

          <div className="section-header">
            <h2>{t('dashboard.expensesTitle')}</h2>
            {hasCategories && !addingExpense && (
              <button type="button" className="button" onClick={() => setAddingExpense(true)}>
                <Icon name="plus" size={16} /> {t('dashboard.addExpense')}
              </button>
            )}
          </div>

          {!hasCategories && (
            <p className="status status--warning">{t('dashboard.noCategories')}</p>
          )}

          {addingExpense && (
            <ExpenseForm
              categories={categoriesState.categories}
              dateRange={dateRange}
              defaultDate={defaultDate}
              monthLabel={monthLabel}
              onSave={handleAddExpense}
              onCancel={() => setAddingExpense(false)}
            />
          )}

          <ExpenseList
            expenses={expensesState.expenses}
            categories={categoriesState.categories}
            dateRange={dateRange}
            monthLabel={monthLabel}
            onUpdate={expensesState.updateExpense}
            onDelete={expensesState.deleteExpense}
          />

          <div className="dashboard-grid">
            <div>
              <div className="section-header">
                <h2>{t('dashboard.byCategory')}</h2>
              </div>
              <div className="chart-panel">
                <CategoryChart expenses={expensesState.expenses} />
              </div>
            </div>

            <div>
              <div className="section-header">
                <h2>{t('dashboard.budgets')}</h2>
                {hasCategories && categoriesWithoutBudget.length > 0 && !addingBudget && (
                  <button type="button" className="button button--ghost" onClick={() => setAddingBudget(true)}>
                    <Icon name="plus" size={16} /> {t('dashboard.newBudget')}
                  </button>
                )}
              </div>

              {addingBudget && (
                <BudgetForm
                  categories={categoriesWithoutBudget}
                  onSave={handleAddBudget}
                  onCancel={() => setAddingBudget(false)}
                />
              )}

              <BudgetList
                budgets={budgetsState.budgets}
                onUpdate={budgetsState.updateBudget}
                onDelete={budgetsState.deleteBudget}
              />
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default Dashboard
