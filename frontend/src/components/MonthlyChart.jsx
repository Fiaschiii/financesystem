import { useEffect, useRef, useState } from 'react'
import { formatBRL, formatCompactBRL, subtractMoney } from '../utils/currency.js'
import { formatMonthYear, formatShortMonthYear } from '../utils/date.js'
import { useI18n } from '../i18n/index.jsx'

const MAX_MONTHS = 12
const HEIGHT = 260
const MARGIN = { top: 12, right: 8, bottom: 28, left: 64 }
const SERIES = [
  { key: 'salary', labelKey: 'chart.salary', className: 'monthly-chart__bar--salary' },
  { key: 'totalSpent', labelKey: 'chart.spent', className: 'monthly-chart__bar--spent' },
]

// Largura do contêiner, atualizada quando a janela muda de tamanho. Assim o
// SVG é desenhado na largura real e o texto não encolhe junto com o gráfico.
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

// Divisões "redondas" para o eixo Y (0, 2.000, 4.000…), com ~4 linhas de grade.
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1]
  const rawStep = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep)
  const ticks = []
  for (let value = 0; value < max + step; value += step) ticks.push(value)
  return ticks
}

// Retângulo com só os cantos de cima arredondados (a base fica reta no eixo).
function barPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

// Colunas agrupadas: salário × gastos dos últimos 12 meses, em ordem
// cronológica. Passar o mouse (ou focar com Tab) num mês mostra os valores.
function MonthlyChart({ history }) {
  const { t } = useI18n()
  const [containerRef, width] = useWidth()
  const [activeIndex, setActiveIndex] = useState(null)

  // O histórico vem do mais recente para o mais antigo.
  const months = history.slice(0, MAX_MONTHS).reverse()

  const maxValue = Math.max(0, ...months.flatMap((m) => [m.salary, m.totalSpent]))
  const ticks = niceTicks(maxValue)
  const top = ticks[ticks.length - 1]

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const groupWidth = months.length > 0 ? innerWidth / months.length : 0
  const barWidth = Math.max(4, Math.min(24, groupWidth * 0.3))
  const gap = 2

  const y = (value) => MARGIN.top + innerHeight - (value / top) * innerHeight
  const groupX = (index) => MARGIN.left + index * groupWidth
  // Em telas estreitas, mostra só um rótulo de mês a cada N para não sobrepor.
  const labelEvery = Math.ceil(months.length / Math.max(1, Math.floor(innerWidth / 48)))

  const active = activeIndex !== null ? months[activeIndex] : null
  const tooltipLeft =
    activeIndex !== null ? Math.min(Math.max(groupX(activeIndex) + groupWidth / 2, 90), width - 90) : 0

  return (
    <div className="monthly-chart">
      <ul className="chart-legend">
        {SERIES.map((series) => (
          <li key={series.key}>
            <span className={`chart-legend__swatch ${series.className}`} aria-hidden="true" />
            {t(series.labelKey)}
          </li>
        ))}
      </ul>

      <div className="monthly-chart__plot" ref={containerRef}>
        {width > 0 && (
          <svg
            width="100%"
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={t('chart.aria', { count: months.length })}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  className={tick === 0 ? 'monthly-chart__baseline' : 'monthly-chart__grid'}
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className="monthly-chart__axis" x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                  {formatCompactBRL(tick)}
                </text>
              </g>
            ))}

            {months.map((month, index) => {
              const center = groupX(index) + groupWidth / 2
              const isActive = index === activeIndex
              return (
                <g
                  key={month.id}
                  tabIndex={0}
                  className="monthly-chart__group"
                  aria-label={t('chart.groupAria', {
                    month: formatMonthYear(month.month, month.year),
                    salary: formatBRL(month.salary),
                    spent: formatBRL(month.totalSpent),
                  })}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                >
                  {/* Área de hover maior que as barras: o mês inteiro. */}
                  <rect
                    className={`monthly-chart__hit${isActive ? ' monthly-chart__hit--active' : ''}`}
                    x={groupX(index)}
                    y={MARGIN.top}
                    width={groupWidth}
                    height={innerHeight}
                  />
                  {SERIES.map((series, s) => {
                    const value = month[series.key]
                    if (value <= 0) return null
                    const x = center - barWidth - gap / 2 + s * (barWidth + gap)
                    return (
                      <path
                        key={series.key}
                        className={`monthly-chart__bar ${series.className}`}
                        d={barPath(x, y(value), barWidth, y(0) - y(value), 4)}
                      />
                    )
                  })}
                  {index % labelEvery === 0 && (
                    <text className="monthly-chart__axis" x={center} y={HEIGHT - 8} textAnchor="middle">
                      {formatShortMonthYear(month.month, month.year)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        {active && (
          <div className="chart-tooltip" style={{ left: tooltipLeft }} role="status">
            <strong>{formatMonthYear(active.month, active.year)}</strong>
            {SERIES.map((series) => (
              <span key={series.key} className="chart-tooltip__row">
                <span className={`chart-legend__swatch ${series.className}`} aria-hidden="true" />
                {t(series.labelKey)}
                <span className="chart-tooltip__value">{formatBRL(active[series.key])}</span>
              </span>
            ))}
            <span className="chart-tooltip__row chart-tooltip__row--total">
              {t('chart.balance')}
              <span
                className={`chart-tooltip__value${active.salary - active.totalSpent < 0 ? ' num--negative' : ''}`}
              >
                {formatBRL(subtractMoney(active.salary, active.totalSpent))}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MonthlyChart
