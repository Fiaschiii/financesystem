import { t } from '../i18n/index.jsx'

// Tipos de gasto: o `value` é o que o backend e o banco guardam (sempre em
// português); o rótulo segue o idioma da interface.
export const EXPENSE_TYPES = [
  { value: 'fixo', labelKey: 'expense.typeFixed' },
  { value: 'variavel', labelKey: 'expense.typeVariable' },
]

export function typeLabel(type) {
  const item = EXPENSE_TYPES.find((option) => option.value === type)
  return item ? t(item.labelKey) : type
}
