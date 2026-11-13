import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SalaryForm from '../../src/components/SalaryForm.jsx'

function setup(props = {}) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue()
  render(<SalaryForm monthLabel="Outubro/2026" onSave={onSave} {...props} />)
  return { onSave, user: userEvent.setup(), input: screen.getByLabelText(/Salário de Outubro\/2026/) }
}

describe('SalaryForm', () => {
  it('envia o valor digitado no formato brasileiro como número', async () => {
    const { onSave, user, input } = setup()
    await user.type(input, '1.234,56')
    await user.click(screen.getByRole('button', { name: 'Salvar salário' }))
    expect(onSave).toHaveBeenCalledWith(1234.56)
  })

  it('salário 0 ("ainda não informado") abre o campo vazio', () => {
    const { input } = setup({ initialValue: 0 })
    expect(input).toHaveValue('')
  })

  it('salário existente abre preenchido', () => {
    const { input } = setup({ initialValue: '4500.00' })
    expect(input).toHaveValue('4500,00')
  })

  it('valor inválido mostra erro e não salva', async () => {
    const { onSave, user, input } = setup()
    await user.type(input, 'muito')
    await user.click(screen.getByRole('button', { name: 'Salvar salário' }))
    expect(screen.getByText(/Informe um valor válido/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('mostra o erro devolvido ao salvar', async () => {
    const { user, input } = setup({ onSave: vi.fn().mockRejectedValue(new Error('Já existe um salário')) })
    await user.type(input, '100')
    await user.click(screen.getByRole('button', { name: 'Salvar salário' }))
    expect(await screen.findByText('Já existe um salário')).toBeInTheDocument()
  })

  it('botão Cancelar só aparece quando há onCancel', async () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })
})
