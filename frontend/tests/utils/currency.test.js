import { describe, it, expect } from 'vitest'
import { formatBRL, formatInputBRL, parseBRL, sumMoney, subtractMoney, formatCompactBRL } from '../../src/utils/currency.js'

// O Intl usa espaço não separável entre "R$" e o número.
const plain = (text) => text.replace(/\s/g, ' ')

describe('parseBRL', () => {
  it.each([
    ['1200', 1200],
    ['1200,50', 1200.5],
    ['1.200,50', 1200.5],
    ['R$ 1.200,50', 1200.5],
    ['r$1.200,50', 1200.5],
    ['1.200', 1200],
    ['1.200.000', 1200000],
    ['1200.50', 1200.5],
    ['0,99', 0.99],
    [',5', 0.5],
    [' 55 ', 55],
  ])('"%s" vira %d', (text, expected) => {
    expect(parseBRL(text)).toBe(expected)
  })

  it.each(['', '   ', 'abc', 'R$', '1,2,3', '-10', '10a', '1.2.3,4,5', null, undefined, 12])('"%s" é inválido', (text) => {
    expect(parseBRL(text)).toBeNaN()
  })

  it('"1.20" é decimal, não milhar', () => {
    expect(parseBRL('1.20')).toBe(1.2)
  })
})

describe('formatação', () => {
  it('formatBRL', () => {
    expect(plain(formatBRL(1200))).toBe('R$ 1.200,00')
    expect(plain(formatBRL('99.9'))).toBe('R$ 99,90')
    expect(plain(formatBRL(-50))).toBe('-R$ 50,00')
    expect(plain(formatBRL('lixo'))).toBe('R$ 0,00')
  })

  it('formatInputBRL não usa separador de milhar', () => {
    expect(formatInputBRL(1200.5)).toBe('1200,50')
    expect(formatInputBRL('3')).toBe('3,00')
    expect(formatInputBRL(undefined)).toBe('0,00')
  })

  it('formatInputBRL e parseBRL são inversos', () => {
    for (const value of [0.01, 9.99, 1200.5, 1234567.89]) {
      expect(parseBRL(formatInputBRL(value))).toBe(value)
    }
  })

  it('formatCompactBRL encurta valores grandes', () => {
    expect(plain(formatCompactBRL(5000))).toBe('R$ 5 mil')
    expect(plain(formatCompactBRL(12500))).toBe('R$ 12,5 mil')
    expect(plain(formatCompactBRL(1500000))).toBe('R$ 1,5 mi')
    expect(plain(formatCompactBRL(0))).toBe('R$ 0')
  })
})

describe('contas em centavos', () => {
  it('sumMoney não acumula erro de ponto flutuante', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney(['10.10', '20.20', 0.01])).toBe(30.31)
    expect(sumMoney([])).toBe(0)
  })

  it('subtractMoney', () => {
    expect(subtractMoney(1, 0.9)).toBe(0.1)
    expect(subtractMoney('5000.00', '5250.50')).toBe(-250.5)
  })
})
