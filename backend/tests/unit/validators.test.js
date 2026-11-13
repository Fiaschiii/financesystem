import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  parseMonth,
  parseYear,
  parseMoney,
  parseUuid,
  parseText,
  parseExpenseType,
  parseDate,
} from '../../src/utils/validators.js'

describe('parseMonth', () => {
  it.each([[1, 1], [12, 12], ['9', 9], [' 10 ', 10]])('aceita %j', (input, expected) => {
    expect(parseMonth(input)).toBe(expected)
  })

  it.each([0, 13, -1, 1.5, '1.5', '', 'abc', null, undefined, true, []])('recusa %j', (input) => {
    expect(() => parseMonth(input)).toThrow(ValidationError)
  })
})

describe('parseYear', () => {
  it('aceita os limites 2000 e 2100', () => {
    expect(parseYear(2000)).toBe(2000)
    expect(parseYear('2100')).toBe(2100)
  })

  it.each([1999, 2101, '20x6', null])('recusa %j', (input) => {
    expect(() => parseYear(input)).toThrow('Ano inválido')
  })
})

describe('parseMoney', () => {
  it('aceita número ou string com ponto decimal', () => {
    expect(parseMoney(1200)).toBe(1200)
    expect(parseMoney('1200.50')).toBe(1200.5)
    expect(parseMoney(' 15 ')).toBe(15)
  })

  it('arredonda para 2 casas, como numeric(12,2)', () => {
    expect(parseMoney(10.005)).toBe(10.01)
    expect(parseMoney('0.004')).toBe(0)
  })

  it('aceita zero por padrão (salário ainda não informado)', () => {
    expect(parseMoney(0, 'Salário')).toBe(0)
  })

  it('com allowZero: false, recusa zero e valores que arredondam para zero', () => {
    expect(() => parseMoney(0, 'Valor', { allowZero: false })).toThrow('maior que zero')
    expect(() => parseMoney(0.001, 'Valor', { allowZero: false })).toThrow('maior que zero')
    expect(parseMoney(0.01, 'Valor', { allowZero: false })).toBe(0.01)
  })

  it.each([-1, '-1', '1,50', '1.200,50', 'R$ 10', '', NaN, Infinity, null, true, {}])(
    'recusa %j',
    (input) => {
      expect(() => parseMoney(input)).toThrow(ValidationError)
    }
  )

  it('respeita o limite do banco (9.999.999.999,99)', () => {
    expect(parseMoney(9999999999.99)).toBe(9999999999.99)
    expect(() => parseMoney(10000000000, 'Salário')).toThrow('Salário alto demais.')
  })

  it('usa o rótulo na mensagem', () => {
    expect(() => parseMoney('x', 'Limite')).toThrow('Limite inválido')
  })
})

describe('parseUuid', () => {
  it('aceita UUID em maiúsculas ou minúsculas', () => {
    const id = '0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D'
    expect(parseUuid(id)).toBe(id)
    expect(parseUuid(id.toLowerCase())).toBe(id.toLowerCase())
  })

  it.each(['123', '', null, 42, "1' or '1'='1"])('recusa %j', (input) => {
    expect(() => parseUuid(input)).toThrow('Identificador inválido.')
  })

  it('usa a mensagem personalizada', () => {
    expect(() => parseUuid('x', 'Categoria inválida.')).toThrow('Categoria inválida.')
  })
})

describe('parseText', () => {
  it('remove espaços das pontas', () => {
    expect(parseText('  Mercado  ', 'Descrição', { max: 120 })).toBe('Mercado')
  })

  it('campo obrigatório vazio ou ausente gera erro', () => {
    for (const value of [undefined, null, '', '   ']) {
      expect(() => parseText(value, 'Descrição', { max: 120 })).toThrow('Descrição é obrigatório.')
    }
  })

  it('campo opcional vazio ou ausente vira null', () => {
    for (const value of [undefined, null, '', '   ']) {
      expect(parseText(value, 'Observação', { max: 500, required: false })).toBeNull()
    }
  })

  it('recusa o que não é texto', () => {
    expect(() => parseText(123, 'Descrição', { max: 120 })).toThrow('Descrição inválido.')
  })

  it('aceita exatamente o máximo e recusa um caractere a mais', () => {
    expect(parseText('a'.repeat(120), 'Descrição', { max: 120 })).toHaveLength(120)
    expect(() => parseText('a'.repeat(121), 'Descrição', { max: 120 })).toThrow('máximo de 120')
  })

  it('o limite vale depois de tirar os espaços das pontas', () => {
    expect(parseText(`  ${'a'.repeat(60)}  `, 'Nome', { max: 60 })).toHaveLength(60)
  })
})

describe('parseExpenseType', () => {
  it('aceita fixo e variavel', () => {
    expect(parseExpenseType('fixo')).toBe('fixo')
    expect(parseExpenseType('variavel')).toBe('variavel')
  })

  it.each(['Fixo', 'variável', '', undefined])('recusa %j', (input) => {
    expect(() => parseExpenseType(input)).toThrow('Tipo inválido')
  })
})

describe('parseDate', () => {
  it('devolve a data com mês e ano', () => {
    expect(parseDate('2026-10-05')).toEqual({ iso: '2026-10-05', month: 10, year: 2026 })
  })

  it('aceita 29 de fevereiro só em ano bissexto', () => {
    expect(parseDate('2028-02-29').month).toBe(2)
    expect(() => parseDate('2026-02-29')).toThrow('esse dia não existe')
  })

  it.each(['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31'])('recusa dia inexistente %s', (input) => {
    expect(() => parseDate(input)).toThrow('esse dia não existe')
  })

  it.each(['05/10/2026', '2026-1-5', '2026-10-05T00:00:00Z', '', null, 20261005])(
    'recusa formato errado %j',
    (input) => {
      expect(() => parseDate(input)).toThrow('use o formato AAAA-MM-DD')
    }
  )

  it('recusa anos fora de 2000–2100', () => {
    expect(() => parseDate('1999-12-31')).toThrow('ano entre 2000 e 2100')
    expect(() => parseDate('2101-01-01')).toThrow('ano entre 2000 e 2100')
  })
})
