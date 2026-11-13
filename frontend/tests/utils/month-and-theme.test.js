import { describe, it, expect, beforeEach } from 'vitest'
import { shiftMonth, parseMonthParam, toMonthParam } from '../../src/utils/date.js'
import { getTheme, setTheme } from '../../src/utils/theme.js'

describe('navegação entre meses', () => {
  it('shiftMonth vira o ano nos dois sentidos', () => {
    expect(shiftMonth(1, 2026, -1)).toEqual({ month: 12, year: 2025 })
    expect(shiftMonth(12, 2026, 1)).toEqual({ month: 1, year: 2027 })
    expect(shiftMonth(6, 2026, 0)).toEqual({ month: 6, year: 2026 })
    expect(shiftMonth(3, 2026, -15)).toEqual({ month: 12, year: 2024 })
  })

  it('toMonthParam e parseMonthParam são inversos', () => {
    expect(toMonthParam(3, 2026)).toBe('2026-03')
    expect(parseMonthParam('2026-03')).toEqual({ month: 3, year: 2026 })
  })

  it.each([null, '', '2026-13', '2026-00', '2026-3', '1999-12', '2101-01', 'abc'])(
    'parseMonthParam(%j) é inválido',
    (value) => {
      expect(parseMonthParam(value)).toBeNull()
    }
  )
})

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('sem escolha salva, é automático', () => {
    expect(getTheme()).toBe('auto')
  })

  it('escuro: marca o <html> e lembra a escolha', () => {
    setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(getTheme()).toBe('dark')
  })

  it('voltar para automático limpa a marca e a escolha salva', () => {
    setTheme('light')
    setTheme('auto')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem('tema')).toBeNull()
  })

  it('valor salvo inválido conta como automático', () => {
    localStorage.setItem('tema', 'roxo')
    expect(getTheme()).toBe('auto')
  })
})
