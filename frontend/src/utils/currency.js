import { getLanguage, getLocale } from '../i18n/index.jsx'

// O dinheiro é sempre em reais (BRL). O que muda com o idioma é só a escrita:
// pt-BR "R$ 1.200,50" (vírgula decimal) e en "R$1,200.50" (ponto decimal).

const formatters = new Map()
function formatter(kind) {
  const key = `${getLocale()}:${kind}`
  if (!formatters.has(key)) {
    const options =
      kind === 'compact'
        ? {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
            // Sem o mínimo 0, o Intl usa 1 casa fixa em moeda e mostra "R$ 5,0 mil".
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }
        : { style: 'currency', currency: 'BRL' }
    formatters.set(key, new Intl.NumberFormat(getLocale(), options))
  }
  return formatters.get(key)
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// 1200 -> "R$ 1.200,00" (en: "R$1,200.00")
export function formatBRL(value) {
  return formatter('full').format(toNumber(value))
}

// 1200.5 -> "1200,50" (en: "1200.50"): valor para preencher um campo de texto, sem milhar
export function formatInputBRL(value) {
  const text = toNumber(value).toFixed(2)
  return getLanguage() === 'en' ? text : text.replace('.', ',')
}

// Lê o que a pessoa digitou e devolve um número (ou NaN).
// pt-BR: "1200", "1200,50", "1.200,50", "R$ 1.200,50" e também "1200.50".
// en:    "1200", "1200.50", "1,200.50", "R$1,200.50".
export function parseBRL(text, language = getLanguage()) {
  if (typeof text !== 'string') return NaN

  let s = text.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!/\d/.test(s) || !/^[\d.,]+$/.test(s)) return NaN

  if (language === 'en') {
    // vírgulas são separadores de milhar, em grupos de 3 ("1,200,000.50")
    if (s.includes(',') && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return NaN
    s = s.replace(/,/g, '')
    if ((s.match(/\./g) ?? []).length > 1) return NaN
  } else if (s.includes(',')) {
    // vírgula = separador decimal; pontos são separadores de milhar
    const parts = s.split(',')
    if (parts.length > 2) return NaN
    s = `${parts[0].replace(/\./g, '')}.${parts[1]}`
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // "1.200" ou "1.200.000": pontos de milhar
    s = s.replace(/\./g, '')
  }
  // senão, um ponto único é decimal ("1200.50")

  const number = Number(s)
  return Number.isFinite(number) ? number : NaN
}

// Soma em centavos para não acumular erro de ponto flutuante (0.1 + 0.2 !== 0.3).
export function sumMoney(values) {
  const cents = values.reduce((total, value) => total + Math.round(Number(value) * 100), 0)
  return cents / 100
}

export function subtractMoney(a, b) {
  return (Math.round(Number(a) * 100) - Math.round(Number(b) * 100)) / 100
}

// 5000 -> "R$ 5 mil" (en: "R$5K"): rótulos de eixo de gráfico, onde não cabe o valor inteiro
export function formatCompactBRL(value) {
  return formatter('compact').format(toNumber(value))
}
