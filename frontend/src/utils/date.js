import { getLanguage, getLocale } from '../i18n/index.jsx'

const MONTH_NAMES = {
  'pt-BR': [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
}

export function monthName(month, language = getLanguage()) {
  return (MONTH_NAMES[language] ?? MONTH_NAMES['pt-BR'])[month - 1]
}

// (10, 2026) -> "Outubro/2026" (en: "October 2026")
export function formatMonthYear(month, year) {
  return getLanguage() === 'en' ? `${monthName(month)} ${year}` : `${monthName(month)}/${year}`
}

const pad = (n) => String(n).padStart(2, '0')

// Data de hoje (horário local) como "AAAA-MM-DD". Não usa toISOString porque ele
// converte para UTC: depois das 21h no horário de Brasília viraria "amanhã".
export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Primeiro e último dia de um mês, como "AAAA-MM-DD".
export function monthRange(month, year) {
  const lastDay = new Date(year, month, 0).getDate()
  return { min: `${year}-${pad(month)}-01`, max: `${year}-${pad(month)}-${pad(lastDay)}` }
}

// "2026-10-05" -> "05/10" (en: "10/05", mês primeiro). Mexe na string de
// propósito: new Date("2026-10-05") é interpretado como UTC e, no Brasil,
// mostraria o dia anterior.
export function formatDayMonth(iso) {
  const [, month, day] = iso.split('-')
  return getLanguage() === 'en' ? `${month}/${day}` : `${day}/${month}`
}

// (10, 2026) -> "Out/26" (en: "Oct/26"): rótulo curto, para eixos de gráfico
export function formatShortMonthYear(month, year) {
  return `${monthName(month).slice(0, 3)}/${String(year).slice(-2)}`
}

// Data e hora completas (ex.: último uso de uma sessão): "09/11/2026, 14:05".
export function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

// Mês vizinho: (1, 2026, -1) -> { month: 12, year: 2025 }
export function shiftMonth(month, year, delta) {
  const index = year * 12 + (month - 1) + delta
  return { month: (index % 12) + 1, year: Math.floor(index / 12) }
}

// Mês da URL (?mes=2026-10). Devolve null se faltar ou for inválido.
// Os limites de ano são os mesmos do backend (2000–2100).
export function parseMonthParam(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null
  return { month, year }
}

// (10, 2026) -> "2026-10"
export function toMonthParam(month, year) {
  return `${year}-${pad(month)}`
}
