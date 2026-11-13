import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthPicker from '../../src/components/MonthPicker.jsx'

const current = { month: 11, year: 2026 }

function setup(month, year) {
  const onChange = vi.fn()
  render(<MonthPicker month={month} year={year} current={current} onChange={onChange} />)
  return { onChange, user: userEvent.setup() }
}

describe('MonthPicker', () => {
  it('mostra o mês e navega para o anterior e o próximo', async () => {
    const { onChange, user } = setup(1, 2026)
    expect(screen.getByText('Janeiro/2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mês anterior (Dezembro/2025)' }))
    expect(onChange).toHaveBeenLastCalledWith({ month: 12, year: 2025 })

    await user.click(screen.getByRole('button', { name: 'Próximo mês (Fevereiro/2026)' }))
    expect(onChange).toHaveBeenLastCalledWith({ month: 2, year: 2026 })
  })

  it('"Ir para o mês atual" só aparece fora do mês atual', async () => {
    const { onChange, user } = setup(3, 2026)
    await user.click(screen.getByRole('button', { name: 'Ir para o mês atual' }))
    expect(onChange).toHaveBeenCalledWith(current)
  })

  it('no mês atual, não mostra o atalho', () => {
    setup(11, 2026)
    expect(screen.queryByRole('button', { name: 'Ir para o mês atual' })).not.toBeInTheDocument()
  })

  it('respeita os limites aceitos pelo backend (2000–2100)', () => {
    setup(1, 2000)
    expect(screen.getByRole('button', { name: /Mês anterior/ })).toBeDisabled()
  })

  it('não passa de dezembro de 2100', () => {
    setup(12, 2100)
    expect(screen.getByRole('button', { name: /Próximo mês/ })).toBeDisabled()
  })
})
