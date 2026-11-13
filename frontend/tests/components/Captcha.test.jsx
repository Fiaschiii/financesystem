import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import Login from '../../src/pages/Login.jsx'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))
// CAPTCHA ligado, com um Turnstile de mentira (sem internet nos testes).
vi.mock('../../src/config/security.js', () => ({
  TURNSTILE_SITE_KEY: 'chave-de-teste',
  isCaptchaEnabled: true,
  IDLE_TIMEOUT_MINUTES: 15,
  IDLE_WARNING_SECONDS: 60,
}))

let widget
beforeEach(() => {
  widget = null
  window.turnstile = {
    render: vi.fn((_el, options) => {
      widget = options
      return 'w1'
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
})

function renderLogin(signIn) {
  useAuth.mockReturnValue({ signIn })
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
  return userEvent.setup()
}

describe('CAPTCHA no login', () => {
  it('o botão só libera depois da verificação; o comprovante vai junto e é renovado', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const user = renderLogin(signIn)
    await screen.findByRole('button', { name: 'Entrar' })
    await vi.waitFor(() => expect(widget).not.toBeNull())
    expect(widget.sitekey).toBe('chave-de-teste')

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'senhaforte')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()

    act(() => widget.callback('comprovante-1'))
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(signIn).toHaveBeenCalledWith('ana@exemplo.com', 'senhaforte', 'comprovante-1')
    // Comprovante usado: pede outro e trava o botão até chegar.
    expect(window.turnstile.reset).toHaveBeenCalledWith('w1')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('comprovante expirado trava o botão de novo', async () => {
    renderLogin(vi.fn())
    await vi.waitFor(() => expect(widget).not.toBeNull())
    act(() => widget.callback('comprovante-1'))
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    act(() => widget['expired-callback']())
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  it('erro do CAPTCHA no Supabase vira mensagem em português', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'captcha protection: request disallowed (invalid-input-response)' } })
    const user = renderLogin(signIn)
    await vi.waitFor(() => expect(widget).not.toBeNull())
    act(() => widget.callback('comprovante-1'))
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'senhaforte')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/verificação anti-robô falhou/)).toBeInTheDocument()
  })
})
