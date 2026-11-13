import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import Register from '../../src/pages/Register.jsx'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

async function fillAndSubmit(signUp) {
  useAuth.mockReturnValue({ signUp })
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
  await user.type(screen.getByLabelText('Senha'), 'senhaforte')
  await user.click(screen.getByRole('button', { name: 'Criar conta' }))
}

describe('Cadastro', () => {
  it('exige senha de no mínimo 8 caracteres (igual ao Supabase)', () => {
    useAuth.mockReturnValue({ signUp: vi.fn() })
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Senha')).toHaveAttribute('minlength', '8')
  })

  it('com confirmação de e-mail ligada, pede para conferir a caixa de entrada', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    await fillAndSubmit(signUp)
    expect(signUp).toHaveBeenCalledWith('ana@exemplo.com', 'senhaforte', '')
    expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument()
  })

  it('mostra o erro do Supabase traduzido', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: {}, error: { message: 'User already registered' } })
    await fillAndSubmit(signUp)
    expect(await screen.findByText('Esse e-mail já está cadastrado.')).toBeInTheDocument()
  })
})
