const MIN_YEAR = 2000
const MAX_YEAR = 2100
const MAX_MONEY = 9999999999.99 // limite de numeric(12,2) no banco

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const EXPENSE_TYPES = ['fixo', 'variavel'] // mesmos valores do check da tabela expenses

// Erro de validação de entrada: o errorHandler transforma em HTTP 400.
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Aceita número inteiro ou string só com dígitos ("9"); rejeita true, null, "", [] etc.
function toInteger(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : NaN
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return NaN
}

export function parseMonth(value) {
  const month = toInteger(value)
  if (Number.isNaN(month) || month < 1 || month > 12) {
    throw new ValidationError('Mês inválido: use um número de 1 a 12.')
  }
  return month
}

export function parseYear(value) {
  const year = toInteger(value)
  if (Number.isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new ValidationError(`Ano inválido: use um valor entre ${MIN_YEAR} e ${MAX_YEAR}.`)
  }
  return year
}

// Valor em reais como número (1200.5) ou string com ponto decimal ("1200.50").
// Arredonda para 2 casas, igual ao numeric(12,2) do banco.
// { allowZero: false } exige valor maior que zero (é o caso do valor de um gasto).
export function parseMoney(value, label = 'Valor', { allowZero = true } = {}) {
  const hint = allowZero ? 'maior ou igual a zero' : 'maior que zero'

  let number = NaN
  if (typeof value === 'number') {
    number = value
  } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    number = Number(value)
  }

  if (!Number.isFinite(number) || number < 0) {
    throw new ValidationError(`${label} inválido: informe um número ${hint}.`)
  }
  if (number > MAX_MONEY) {
    throw new ValidationError(`${label} alto demais.`)
  }

  const rounded = Math.round(number * 100) / 100
  if (!allowZero && rounded <= 0) {
    throw new ValidationError(`${label} inválido: informe um número ${hint}.`)
  }
  return rounded
}

export function parseUuid(value, message = 'Identificador inválido.') {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new ValidationError(message)
  }
  return value
}

// Texto livre (descrição, observação). Remove espaços das pontas.
// Se não for obrigatório e vier vazio/ausente, devolve null.
export function parseText(value, label, { max, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${label} é obrigatório.`)
    return null
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${label} inválido.`)
  }

  const text = value.trim()
  if (!text) {
    if (required) throw new ValidationError(`${label} é obrigatório.`)
    return null
  }
  if (text.length > max) {
    throw new ValidationError(`${label} muito longo (máximo de ${max} caracteres).`)
  }
  return text
}

export function parseExpenseType(value) {
  if (!EXPENSE_TYPES.includes(value)) {
    throw new ValidationError('Tipo inválido: use "fixo" ou "variavel".')
  }
  return value
}

// Data no formato AAAA-MM-DD, existente no calendário (rejeita 2026-02-31).
// Devolve também o mês e o ano, que definem a que mês o gasto pertence.
export function parseDate(value, label = 'Data') {
  const match = typeof value === 'string' ? DATE_REGEX.exec(value) : null
  if (!match) {
    throw new ValidationError(`${label} inválida: use o formato AAAA-MM-DD.`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))
  const exists =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!exists) {
    throw new ValidationError(`${label} inválida: esse dia não existe no calendário.`)
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new ValidationError(`${label} inválida: use um ano entre ${MIN_YEAR} e ${MAX_YEAR}.`)
  }

  return { iso: value, month, year }
}

// ------------------------------------------------------------
// Perfil (Etapa 18)
// ------------------------------------------------------------

// Telefone. Aceita o que a pessoa digita ("(11) 98765-4321", "+55 11 98765-4321")
// e devolve no formato internacional E.164 ("+5511987654321"), o mesmo que o
// banco exige. Sem "+", número de 10 ou 11 dígitos é tratado como brasileiro
// (DDD + número). Vazio = remover o telefone (null).
export function parsePhone(value, label = 'Telefone') {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new ValidationError(`${label} inválido.`)

  const text = value.trim()
  if (!text) return null
  if (!/^\+?[\d\s().-]+$/.test(text)) throw new ValidationError(`${label} inválido.`)

  const digits = text.replace(/\D/g, '')
  let e164
  if (text.startsWith('+')) {
    e164 = `+${digits}`
  } else if (digits.length === 10 || digits.length === 11) {
    e164 = `+55${digits}`
  } else if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    e164 = `+${digits}`
  } else {
    throw new ValidationError(`${label} inválido: informe DDD e número, por exemplo (11) 98765-4321.`)
  }

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new ValidationError(`${label} inválido: informe DDD e número, por exemplo (11) 98765-4321.`)
  }
  // Celular brasileiro: 11 dígitos depois do 55, com 9 na frente do número.
  if (e164.startsWith('+55') && ![12, 13].includes(e164.length - 1)) {
    throw new ValidationError(`${label} inválido: informe DDD e número, por exemplo (11) 98765-4321.`)
  }
  return e164
}

// Um valor de uma lista fechada (idioma, tema).
export function parseOneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${label} inválido: use ${allowed.map((v) => `"${v}"`).join(', ')}.`)
  }
  return value
}

// Liga/desliga: só true ou false de verdade (nada de "sim", 1, "true").
export function parseBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${label} inválido: use true ou false.`)
  }
  return value
}
