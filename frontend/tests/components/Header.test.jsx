import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import Header from '../../src/components/Header.jsx'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

function renderHeader(user = { id: 'u1', email: 'ana@exemplo.com' }, mfaPending = false) {
  useAuth.mockReturnValue({ user, mfaPending, signOut: vi.fn() })
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  )
  return userEvent.setup()
}

describe('Header', () => {
  it('logado: mostra os links e "Meu Perfil" no lugar do e-mail (que fica só na dica do mouse)', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Resumo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Histórico' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Meu Perfil/ })).toHaveAttribute('title', 'Minha conta (ana@exemplo.com)')
    expect(screen.queryByText('ana@exemplo.com')).not.toBeInTheDocument()
  })

  it('botão de menu (celular) abre e fecha, avisando o estado', async () => {
    const user = renderHeader()
    const button = screen.getByRole('button', { name: 'Abrir menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('main-nav')).toHaveClass('app-header__nav--open')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('o menu fecha ao escolher uma página', async () => {
    const user = renderHeader()
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await user.click(screen.getByRole('link', { name: 'Histórico' }))
    expect(document.getElementById('main-nav')).not.toHaveClass('app-header__nav--open')
  })

  it('sem login: só o link Entrar, sem botão de menu', () => {
    renderHeader(null)
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
  })

  it('falta o código do app: sem menu, só o botão Sair', () => {
    renderHeader(undefined, true)
    expect(screen.queryByRole('link', { name: 'Resumo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
})

describe('Header: idioma antes de entrar', () => {
  it('sem login, um botão troca o idioma da tela', async () => {
    const { I18nProvider, applyLanguage } = await import('../../src/i18n/index.jsx')
    useAuth.mockReturnValue({ user: null, mfaPending: false, signOut: vi.fn() })
    render(
      <I18nProvider initialLanguage="pt-BR">
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </I18nProvider>
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Idioma: English' }))
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Language: Português (Brasil)' })).toHaveTextContent('PT')
    applyLanguage('pt-BR')
    localStorage.clear()
  })
})
