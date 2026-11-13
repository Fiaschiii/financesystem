import { describe, it, expect } from 'vitest'
import { currentMonthYear, monthRange } from '../../src/utils/date.js'

describe('currentMonthYear', () => {
  it('usa o mês com base 1 (janeiro = 1)', () => {
    expect(currentMonthYear(new Date(2026, 0, 15))).toEqual({ month: 1, year: 2026 })
    expect(currentMonthYear(new Date(2026, 11, 31))).toEqual({ month: 12, year: 2026 })
  })
})

describe('monthRange', () => {
  it.each([
    [1, 2026, '2026-01-31'],
    [2, 2026, '2026-02-28'],
    [2, 2028, '2028-02-29'],
    [4, 2026, '2026-04-30'],
    [12, 2026, '2026-12-31'],
  ])('mês %i/%i termina em %s', (month, year, max) => {
    const range = monthRange(month, year)
    expect(range.min).toBe(`${year}-${String(month).padStart(2, '0')}-01`)
    expect(range.max).toBe(max)
  })
})
