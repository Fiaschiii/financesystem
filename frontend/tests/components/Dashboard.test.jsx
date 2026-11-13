import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { apiFetch } from '../../src/services/api.js'
import { useFinance } from '../../src/hooks/useFinance.js'
import Dashboard from '../../src/pages/Dashboard.jsx'

vi.mock('../../src/services/api.js', () => ({ apiFetch: vi.fn() }))

// Backend falso: só outubro/2026 tem salário e um gasto.
function fakeBackend(path) {
  if (path === '/api/categories') return { categories: [{ id: 'c1', name: 'Mercado' }] }
  if (path.startsWith('/api/finance/')) {
    const [, , , year, month] = path.split('/')
    const finance = year === '2026' && month === '10' ? { id: 'f10', salary: 5000 } : null
    return { month: +month, year: +year, finance }
  }
  if (path.startsWith('/api/expenses')) {
    const october = path.includes('month=10&year=2026')
    const expenses = october
      ? [{ id: 'e1', description: 'Feira', amount: 120, type: 'variavel', expense_date: '2026-10-03', category_id: 'c1', category: { id: 'c1', name: 'Mercado' } }]
      : []
    return { expenses }
  }
  if (path.startsWith('/api/budgets')) return { budgets: [] }
  throw new Error(`rota não simulada: ${path}`)
}

let currentUrl
function UrlSpy() {
  const location = useLocation()
  currentUrl = location.pathname + location.search
  return null
}

function renderAt(url) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Dashboard />
      <UrlSpy />
    </MemoryRouter>
  )
  return userEvent.setup()
}

beforeEach(() => {
  apiFetch.mockImplementation(async (path) => fakeBackend(path))
})

describe('Dashboard: navegação entre meses', () => {
  it('abre o mês da URL e mostra os dados dele', async () => {
    renderAt('/?mes=2026-10')
    expect(await screen.findByText('Feira')).toBeInTheDocument()
    expect(screen.getByText('Outubro/2026')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/finance/2026/10')
  })

  it('a seta muda o mês na URL e busca os dados do novo mês', async () => {
    const user = renderAt('/?mes=2026-10')
    await screen.findByText('Feira')

    await user.click(screen.getByRole('button', { name: /Próximo mês/ }))
    expect(await screen.findByText('Você ainda não cadastrou o salário de Novembro/2026.')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/expenses?month=11&year=2026')
    expect(screen.queryByText('Feira')).not.toBeInTheDocument()
    expect(currentUrl).toMatch(/mes=2026-11|^\/$/)
  })

  it('mês inválido na URL cai no mês atual', async () => {
    const now = new Date()
    renderAt('/?mes=2026-99')
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(`/api/finance/${now.getFullYear()}/${now.getMonth() + 1}`)
    )
  })
})

describe('useFinance', () => {
  it('trocando de mês rápido, uma resposta atrasada do mês anterior não sobrescreve o atual', async () => {
    let resolveOld
    apiFetch.mockImplementation((path) =>
      path === '/api/finance/2026/9'
        ? new Promise((resolve) => (resolveOld = () => resolve({ finance: { id: 'setembro' } })))
        : Promise.resolve({ finance: { id: 'outubro' } })
    )

    const { result, rerender } = renderHook(({ month }) => useFinance(month, 2026), { initialProps: { month: 9 } })
    rerender({ month: 10 })
    await waitFor(() => expect(result.current.finance?.id).toBe('outubro'))

    resolveOld()
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current.finance.id).toBe('outubro')
  })
})
