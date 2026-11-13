import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import IdleLogout, { LOGOUT_REASON_KEY } from '../../src/components/IdleLogout.jsx'
import Login from '../../src/pages/Login.jsx'
import { ACTIVITY_KEY } from '../../src/hooks/useIdleTimer.js'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

const MINUTE = 60 * 1000
let signOut

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  sessionStorage.clear()
  signOut = vi.fn(async () => {})
  useAuth.mockReturnValue({ user: { id: 'u1' }, signOut })
})
afterEach(() => vi.useRealTimers())

function renderIdle() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <IdleLogout />
      <Routes>
        <Route path="/" element="Resumo" />
        <Route path="/login" element="Tela de login" />
      </Routes>
    </MemoryRouter>
  )
}
const advance = (ms) => act(() => vi.advanceTimersByTime(ms))

describe('encerramento por inatividade (15 min, aviso 1 min antes)', () => {
  it('14 min sem uso: aviso com contagem; 15 min: sai só deste navegador e vai ao login', async () => {
    renderIdle()
    advance(13 * MINUTE)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    advance(1 * MINUTE)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('60 s')
    expect(screen.getByRole('button', { name: 'Continuar conectado' })).toHaveFocus()

    await act(async () => vi.advanceTimersByTime(MINUTE))
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(LOGOUT_REASON_KEY)).toBe('idle')
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('usar o sistema reinicia a contagem', () => {
    renderIdle()
    advance(10 * MINUTE)
    fireEvent.keyDown(window, { key: 'a' })
    advance(10 * MINUTE)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('com o aviso aberto, mexer o mouse não basta: precisa clicar em "Continuar conectado"', () => {
    renderIdle()
    advance(14 * MINUTE)
    fireEvent.pointerMove(window)
    advance(2000)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continuar conectado' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    advance(10 * MINUTE)
    expect(signOut).not.toHaveBeenCalled()
  })

  it('uso em outra aba conta: o aviso some sozinho', () => {
    renderIdle()
    advance(14 * MINUTE)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    localStorage.setItem(ACTIVITY_KEY, String(Date.now())) // a outra aba gravou
    advance(1000)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('"Sair agora" faz o logout normal', async () => {
    renderIdle()
    advance(14 * MINUTE)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sair agora' })))
    expect(signOut).toHaveBeenCalledWith()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('sem login, não conta nada', () => {
    useAuth.mockReturnValue({ user: null, signOut })
    renderIdle()
    advance(60 * MINUTE)
    expect(signOut).not.toHaveBeenCalled()
  })

  it('a tela de login explica o motivo uma vez só', () => {
    vi.useRealTimers()
    sessionStorage.setItem(LOGOUT_REASON_KEY, 'idle')
    const renderLogin = () =>
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      )
    const first = renderLogin()
    expect(screen.getByText(/encerrada depois de 15 minutos sem uso/)).toBeInTheDocument()
    first.unmount()
    renderLogin()
    expect(screen.queryByText(/sem uso/)).not.toBeInTheDocument()
  })
})
