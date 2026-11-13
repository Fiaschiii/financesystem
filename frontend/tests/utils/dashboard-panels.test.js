import { describe, it, expect } from 'vitest'
import {
  DASHBOARD_PANELS,
  PANEL_ICONS,
  isDefaultLayout,
  movePanel,
  resolvePanels,
  toSaved,
} from '../../src/utils/dashboardPanels.js'

const ids = (panels) => panels.map((panel) => panel.id)

describe('resolvePanels', () => {
  it('sem nada salvo, é o padrão', () => {
    expect(resolvePanels(null)).toEqual(DASHBOARD_PANELS)
    expect(isDefaultLayout(resolvePanels(undefined))).toBe(true)
  })

  it('usa a ordem e os ícones salvos', () => {
    const saved = [...toSaved(DASHBOARD_PANELS)].reverse()
    saved[0] = { id: 'percent', icon: 'star' }
    const panels = resolvePanels(saved)
    expect(ids(panels)).toEqual(['percent', 'variable', 'fixed', 'balance', 'spent', 'salary'])
    expect(panels[0]).toMatchObject({ icon: 'star', labelKey: 'card.percent' })
    expect(isDefaultLayout(panels)).toBe(false)
  })

  it('dado estranho não quebra: ignora repetido/desconhecido, ícone inexistente vira o padrão, o que falta vai para o fim', () => {
    const panels = resolvePanels([
      { id: 'balance', icon: 'naoExiste' },
      { id: 'balance', icon: 'star' },
      { id: 'admin', icon: 'star' },
      null,
      'salary',
    ])
    expect(ids(panels)).toEqual(['balance', 'salary', 'spent', 'fixed', 'variable', 'percent'])
    expect(panels[0].icon).toBe('scale')
  })

  it('lista que não é lista vira o padrão', () => {
    expect(resolvePanels({ salary: 'wallet' })).toEqual(DASHBOARD_PANELS)
  })
})

describe('movePanel', () => {
  it('troca com o vizinho e não sai dos limites', () => {
    expect(ids(movePanel(DASHBOARD_PANELS, 1, -1)).slice(0, 2)).toEqual(['spent', 'salary'])
    expect(ids(movePanel(DASHBOARD_PANELS, 0, 1)).slice(0, 2)).toEqual(['spent', 'salary'])
    expect(movePanel(DASHBOARD_PANELS, 0, -1)).toBe(DASHBOARD_PANELS)
    expect(movePanel(DASHBOARD_PANELS, 5, 1)).toBe(DASHBOARD_PANELS)
  })
})

it('os ícones padrão estão na lista de ícones aceitos', () => {
  for (const panel of DASHBOARD_PANELS) expect(PANEL_ICONS).toContain(panel.icon)
})
