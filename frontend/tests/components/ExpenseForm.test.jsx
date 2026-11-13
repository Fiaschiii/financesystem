import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseForm from '../../src/components/ExpenseForm.jsx'

const categories = [
  { id: 'c1', name: 'Alimentação' },
  { id: 'c2', name: 'Lazer' },
]

function setup(props = {}) {
  const onSave = vi.fn().mockResolvedValue()
  const onCancel = vi.fn()
  render(
    <ExpenseForm
      categories={categories}
      dateRange={{ min: '2026-10-01', max: '2026-10-31' }}
      defaultDate="2026-10-05"
      monthLabel="Outubro/2026"
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onSave, onCancel, user: userEvent.setup() }
}

const field = (label) => screen.getByLabelText(label)
const submit = (user) => user.click(screen.getByRole('button', { name: 'Salvar gasto' }))

describe('ExpenseForm', () => {
  it('envia o gasto com os campos limpos', async () => {
    const { onSave, user } = setup()
    await user.type(field('Descrição'), '  Mercado  ')
    await user.type(field(/^Valor/), '1.250,40')
    await user.selectOptions(field('Categoria'), 'c1')
    await user.click(screen.getByLabelText('Fixo'))
    await submit(user)

    expect(onSave).toHaveBeenCalledWith({
      description: 'Mercado',
      amount: 1250.4,
      category_id: 'c1',
      type: 'fixo',
      expense_date: '2026-10-05',
      notes: null,
    })
  })

  it.each([
    ['sem descrição', {}, 'Informe a descrição.'],
    ['valor inválido', { description: 'X', amount: 'abc' }, 'Informe um valor válido'],
    ['valor zero', { description: 'X', amount: '0' }, 'O valor precisa ser maior que zero.'],
    ['sem categoria', { description: 'X', amount: '10' }, 'Escolha uma categoria.'],
  ])('%s: mostra erro e não salva', async (_name, values, message) => {
    const { onSave, user } = setup()
    if (values.description) await user.type(field('Descrição'), values.description)
    if (values.amount) await user.type(field(/^Valor/), values.amount)
    await submit(user)

    expect(screen.getByText(new RegExp(message.replace('.', '\\.')))).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('data fora do mês exibido: mostra erro e não salva', async () => {
    const { onSave, user } = setup({ defaultDate: '2026-11-02' })
    await user.type(field('Descrição'), 'X')
    await user.type(field(/^Valor/), '10')
    await user.selectOptions(field('Categoria'), 'c2')
    await submit(user)

    expect(screen.getByText('Escolha uma data dentro de Outubro/2026.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('na edição, começa com os valores do gasto', () => {
    setup({
      initialValues: {
        description: 'Aluguel',
        amount: '1500.00',
        category_id: 'c2',
        type: 'fixo',
        expense_date: '2026-10-10',
        notes: 'Outubro',
      },
    })
    expect(field('Descrição')).toHaveValue('Aluguel')
    expect(field(/^Valor/)).toHaveValue('1500,00')
    expect(field('Categoria')).toHaveValue('c2')
    expect(screen.getByLabelText('Fixo')).toBeChecked()
    expect(field('Data')).toHaveValue('2026-10-10')
    expect(field('Observação (opcional)')).toHaveValue('Outubro')
  })

  it('mostra o erro devolvido pelo backend', async () => {
    const { onSave, user } = setup()
    onSave.mockRejectedValue(new Error('Categoria inválida.'))
    await user.type(field('Descrição'), 'X')
    await user.type(field(/^Valor/), '10')
    await user.selectOptions(field('Categoria'), 'c1')
    await submit(user)

    expect(await screen.findByText('Categoria inválida.')).toBeInTheDocument()
  })

  it('Cancelar chama onCancel', async () => {
    const { onCancel, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
