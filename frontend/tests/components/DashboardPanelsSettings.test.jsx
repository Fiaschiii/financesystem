import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { apiFetch } from '../../src/services/api.js'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import { ProfileProvider } from '../../src/hooks/useProfile.jsx'
import { ToastProvider } from '../../src/hooks/useToast.jsx'
import { I18nProvider } from '../../src/i18n/index.jsx'
import Settings from '../../src/pages/Settings.jsx'
import Dashboard from '../../src/pages/Dashboard.jsx'

vi.mock('../../src/services/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

let profile

// Backend falso: guarda o que o perfil recebeu, como o servidor faria.
async function fakeBackend(path, options = {}) {
  const method = options.method ?? 'GET'
  if (path === '/api/profile' && method === 'GET') return { profile }
  if (path === '/api/profile' && method === 'PUT') {
    profile = { ...profile, ...JSON.parse(options.body) }
    return { profile }
  }
  if (path === '/api/categories') return { categories: [{ id: 'c1', name: 'Mercado' }] }
  if (path.startsWith('/api/finance/')) return { finance: { id: 'f1', salary: 5000 } }
  if (path.startsWith('/api/expenses')) return { expenses: [] }
  if (path.startsWith('/api/budgets')) return { budgets: [] }
  throw new Error(`rota não simulada: ${method} ${path}`)
}

function lastSavedPanels() {
  const puts = apiFetch.mock.calls.filter(([path, options]) => path === '/api/profile' && options?.method === 'PUT')
  return JSON.parse(puts.at(-1)[1].body).dashboard_panels
}

beforeEach(() => {
  profile = { language: 'pt-BR', theme: 'auto', dashboard_panels: null }
  useAuth.mockReturnValue({ user: { id: 'u-ana', factors: [] }, mfaPending: false })
  apiFetch.mockImplementation(fakeBackend)
})

function renderPage(page) {
  render(
    <MemoryRouter>
      <I18nProvider initialLanguage="pt-BR">
        <ProfileProvider>
          <ToastProvider>{page}</ToastProvider>
        </ProfileProvider>
      </I18nProvider>
    </MemoryRouter>
  )
  return userEvent.setup()
}

const panelNames = () => [...document.querySelectorAll('.panel-list__name')].map((el) => el.textContent)

describe('Configurações', () => {
  it('mostra só painéis e categorias (sem "Conta, segurança e aparência" nem "Conexão")', async () => {
    renderPage(<Settings />)
    expect(await screen.findByRole('heading', { name: 'Painéis do Resumo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Conta, segurança e aparência' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Conexão' })).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/health'), expect.anything())
  })

  it('subir um painel salva a lista completa na nova ordem', async () => {
    const user = renderPage(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Subir Gastos' }))

    expect(lastSavedPanels()).toEqual([
      { id: 'spent', icon: 'cart' },
      { id: 'salary', icon: 'wallet' },
      { id: 'balance', icon: 'scale' },
      { id: 'fixed', icon: 'pin' },
      { id: 'variable', icon: 'shuffle' },
      { id: 'percent', icon: 'percent' },
    ])
    expect(await screen.findByText('Painéis salvos.')).toBeInTheDocument()
    expect(panelNames().slice(0, 2)).toEqual(['Gastos', 'Salário'])
    // Primeiro não sobe; último não desce.
    expect(screen.getByRole('button', { name: 'Subir Gastos' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer % do salário gasto' })).toBeDisabled()
  })

  it('trocar o ícone de um painel', async () => {
    const user = renderPage(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Trocar ícone de Saldo' }))
    const picker = screen.getByRole('group', { name: 'Ícone de Saldo' })
    expect(within(picker).getByRole('button', { name: 'Balança' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(picker).getByRole('button', { name: 'Estrela' }))

    expect(lastSavedPanels()[2]).toEqual({ id: 'balance', icon: 'star' })
    expect(screen.queryByRole('group', { name: 'Ícone de Saldo' })).not.toBeInTheDocument()
  })

  it('"Restaurar padrão" grava null e só fica ativo quando algo mudou', async () => {
    profile.dashboard_panels = [
      { id: 'percent', icon: 'star' },
      { id: 'spent', icon: 'cart' },
      { id: 'balance', icon: 'scale' },
      { id: 'fixed', icon: 'pin' },
      { id: 'variable', icon: 'shuffle' },
      { id: 'salary', icon: 'wallet' },
    ]
    const user = renderPage(<Settings />)
    await waitFor(() => expect(panelNames()[0]).toBe('% do salário gasto'))

    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }))

    expect(lastSavedPanels()).toBeNull()
    await waitFor(() => expect(panelNames()[0]).toBe('Salário'))
    expect(screen.getByRole('button', { name: 'Restaurar padrão' })).toBeDisabled()
  })

  it('se o servidor recusar, a ordem volta ao que era e o erro aparece', async () => {
    apiFetch.mockImplementation(async (path, options) => {
      if (options?.method === 'PUT') throw new Error('Falhou')
      return fakeBackend(path, options)
    })
    const user = renderPage(<Settings />)
    await user.click(await screen.findByRole('button', { name: 'Descer Salário' }))

    expect(await screen.findByText('Falhou')).toBeInTheDocument()
    expect(panelNames().slice(0, 2)).toEqual(['Salário', 'Gastos'])
  })
})

describe('Resumo', () => {
  it('mostra os cartões na ordem salva no perfil', async () => {
    profile.dashboard_panels = [
      { id: 'balance', icon: 'star' },
      { id: 'salary', icon: 'wallet' },
      { id: 'spent', icon: 'cart' },
      { id: 'fixed', icon: 'pin' },
      { id: 'variable', icon: 'shuffle' },
      { id: 'percent', icon: 'percent' },
    ]
    renderPage(<Dashboard />)

    await waitFor(() => {
      const labels = [...document.querySelectorAll('.dashboard-card__label')].map((el) => el.textContent)
      expect(labels).toEqual(['Saldo', 'Salário', 'Gastos', 'Gastos fixos', 'Gastos variáveis', '% do salário gasto'])
    })
  })
})
