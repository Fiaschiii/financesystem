import Icon from './Icon.jsx'
import { formatMonthYear, shiftMonth } from '../utils/date.js'
import { useI18n } from '../i18n/index.jsx'

const MIN = 2000 * 12
const MAX = 2100 * 12 + 11

// ‹ Outubro/2026 ›  — troca o mês exibido. "Ir para o mês atual" aparece
// quando a pessoa está olhando outro mês.
function MonthPicker({ month, year, current, onChange }) {
  const { t } = useI18n()
  const index = year * 12 + (month - 1)
  const isCurrent = month === current.month && year === current.year
  const prev = shiftMonth(month, year, -1)
  const next = shiftMonth(month, year, 1)

  return (
    <div className="month-picker">
      <button
        type="button"
        className="icon-button"
        onClick={() => onChange(prev)}
        disabled={index <= MIN}
        aria-label={t('month.prev', { month: formatMonthYear(prev.month, prev.year) })}
      >
        <Icon name="chevronLeft" />
      </button>
      <span className="month-picker__label" aria-live="polite">
        {formatMonthYear(month, year)}
      </span>
      <button
        type="button"
        className="icon-button"
        onClick={() => onChange(next)}
        disabled={index >= MAX}
        aria-label={t('month.next', { month: formatMonthYear(next.month, next.year) })}
      >
        <Icon name="chevronRight" />
      </button>
      {!isCurrent && (
        <button type="button" className="link-button month-picker__today" onClick={() => onChange(current)}>
          {t('month.today')}
        </button>
      )}
    </div>
  )
}

export default MonthPicker
