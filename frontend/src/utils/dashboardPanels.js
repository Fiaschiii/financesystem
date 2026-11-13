// Painéis (cartões) do Resumo que a pessoa pode reordenar e trocar o ícone
// em Configurações. A escolha fica no perfil (profiles.dashboard_panels),
// como o tema e o idioma. Mesmas listas do backend (profileController.js).

export const DASHBOARD_PANELS = [
  { id: 'salary', labelKey: 'card.salary', icon: 'wallet' },
  { id: 'spent', labelKey: 'card.spent', icon: 'cart' },
  { id: 'balance', labelKey: 'card.balance', icon: 'scale' },
  { id: 'fixed', labelKey: 'card.fixed', icon: 'pin' },
  { id: 'variable', labelKey: 'card.variable', icon: 'shuffle' },
  { id: 'percent', labelKey: 'card.percent', icon: 'percent' },
]

export const PANEL_ICONS = [
  'wallet', 'cart', 'scale', 'pin', 'shuffle', 'percent', 'coins', 'creditCard', 'chart',
  'trendUp', 'trendDown', 'home', 'calendar', 'target', 'star', 'heart', 'bolt', 'gift',
]

const BY_ID = Object.fromEntries(DASHBOARD_PANELS.map((panel) => [panel.id, panel]))

// O que foi salvo -> lista completa, na ordem escolhida. Tolera dado velho
// ou estranho: painel desconhecido ou repetido é ignorado, ícone
// desconhecido vira o padrão, e painel que faltar entra no fim.
export function resolvePanels(saved) {
  const result = []
  const seen = new Set()
  for (const item of Array.isArray(saved) ? saved : []) {
    const base = BY_ID[item?.id]
    if (!base || seen.has(base.id)) continue
    seen.add(base.id)
    result.push({ ...base, icon: PANEL_ICONS.includes(item.icon) ? item.icon : base.icon })
  }
  for (const base of DASHBOARD_PANELS) {
    if (!seen.has(base.id)) result.push({ ...base })
  }
  return result
}

// Formato que o backend espera.
export function toSaved(panels) {
  return panels.map(({ id, icon }) => ({ id, icon }))
}

// Igual ao padrão? (para desabilitar "Restaurar padrão")
export function isDefaultLayout(panels) {
  return panels.every((panel, index) => {
    const base = DASHBOARD_PANELS[index]
    return panel.id === base.id && panel.icon === base.icon
  })
}

export function movePanel(panels, index, offset) {
  const target = index + offset
  if (target < 0 || target >= panels.length) return panels
  const next = [...panels]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
