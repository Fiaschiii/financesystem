import { useFinanceHistory } from '../hooks/useFinanceHistory.js'
import { useCategories } from '../hooks/useCategories.js'
import HistoryRow from '../components/HistoryRow.jsx'
import MonthlyChart from '../components/MonthlyChart.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { Skeleton, SkeletonRows, LoadingLabel } from '../components/Skeleton.jsx'
import { useI18n } from '../i18n/index.jsx'

function History() {
  usePageTitle('history.pageTitle')
  const { t } = useI18n()
  const { history, loading, error, updateSalary, reload } = useFinanceHistory()
  const categoriesState = useCategories()

  const combinedError = error || categoriesState.error
  const combinedLoading = !combinedError && (loading || categoriesState.loading)
  useRouteReady(!combinedLoading)

  function reloadAll() {
    reload()
    categoriesState.reload()
  }

  return (
    <section className="page page--wide">
      <h1>{t('history.title')}</h1>

      {combinedLoading && (
        <>
          <LoadingLabel />
          <div className="chart-panel">
            <Skeleton height={220} />
          </div>
          <SkeletonRows />
        </>
      )}

      {combinedError && (
        <div className="dashboard-panel">
          <p className="status status--error">{combinedError}</p>
          <button type="button" className="button button--ghost" onClick={reloadAll}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!combinedLoading && !combinedError && history.length === 0 && (
        <p className="empty-state">{t('history.empty')}</p>
      )}

      {!combinedLoading && !combinedError && history.length > 0 && (
        <div className="section-header">
          <h2>{t('history.chartTitle', { count: Math.min(history.length, 12) })}</h2>
        </div>
      )}

      {!combinedLoading && !combinedError && history.length > 0 && (
        <div className="chart-panel">
          <MonthlyChart history={history} />
        </div>
      )}

      {!combinedLoading && !combinedError && history.length > 0 && (
        <div className="table-wrap">
          <table className="expense-table history-table">
            <thead>
              <tr>
                <th>{t('history.month')}</th>
                <th className="num">{t('history.salary')}</th>
                <th className="num">{t('history.spent')}</th>
                <th className="num">{t('history.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  categories={categoriesState.categories}
                  onSaveSalary={updateSalary}
                  onChanged={reload}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default History
