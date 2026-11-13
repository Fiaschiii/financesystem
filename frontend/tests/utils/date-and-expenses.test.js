import { describe, it, expect } from 'vitest'
import { formatMonthYear, toISODate, monthRange, formatDayMonth, formatShortMonthYear } from '../../src/utils/date.js'
import { typeLabel } from '../../src/utils/expenses.js'

describe('datas', () => {
  it('formatMonthYear', () => {
    expect(formatMonthYear(1, 2026)).toBe('Janeiro/2026')
    expect(formatMonthYear(12, 2026)).toBe('Dezembro/2026')
  })

  it('formatShortMonthYear', () => {
    expect(formatShortMonthYear(3, 2026)).toBe('Mar/26')
  })

  it('toISODate usa o horário local (23h não vira o dia seguinte)', () => {
    expect(toISODate(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
    expect(toISODate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('monthRange respeita meses curtos e anos bissextos', () => {
    expect(monthRange(2, 2026)).toEqual({ min: '2026-02-01', max: '2026-02-28' })
    expect(monthRange(2, 2028)).toEqual({ min: '2028-02-01', max: '2028-02-29' })
    expect(monthRange(11, 2026)).toEqual({ min: '2026-11-01', max: '2026-11-30' })
  })

  it('formatDayMonth não sofre com fuso horário', () => {
    expect(formatDayMonth('2026-10-01')).toBe('01/10')
  })
})

describe('typeLabel', () => {
  it('traduz o valor do banco para o rótulo da tela', () => {
    expect(typeLabel('fixo')).toBe('Fixo')
    expect(typeLabel('variavel')).toBe('Variável')
    expect(typeLabel('desconhecido')).toBe('desconhecido')
  })
})
