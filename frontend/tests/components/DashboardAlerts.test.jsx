import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { useProfile, notificationsOf } from '../../src/hooks/useProfile.jsx'
import DashboardAlerts, { budgetAlerts } from '../../src/components/DashboardAlerts.jsx'

vi.mock('../../src/hooks/useProfile.jsx', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useProfile: vi.fn() }
})

const budget = (name, spent, limit) => ({ id: name, spent, limit_amount: limit, category: { name } })
const BUDGETS = [budget('Mercado', 900, 1000), budget('Lazer', 250, 200), budget('Saúde', 10, 100)]

function setPrefs(prefs = {}, mfaEnabled = false, isDemo = false) {
  useProfile.mockReturnValue({
    mfaEnabled,
    isDemo,
    notifications: notificationsOf({
      notify_budget_alerts: true,
      notify_missing_salary: true,
      notify_mfa_reminder: true,
      ...prefs,
    }),
  })
}

function renderAlerts(props = {}) {
  const onInformSalary = vi.fn()
  render(
    <MemoryRouter>
      <DashboardAlerts budgets={BUDGETS} salaryMissing monthLabel="Novembro/2026" onInformSalary={onInformSalary} {...props} />
    </MemoryRouter>
  )
  return { user: userEvent.setup(), onInformSalary }
}

beforeEach(() => setPrefs())

describe('budgetAlerts', () => {
  it('separa estouradas e perto do limite (80% ou mais)', () => {
    const { over, near } = budgetAlerts([...BUDGETS, budget('Zero', 5, 0), budget('Exato', 80, 100)])
    expect(over.map((b) => b.category.name)).toEqual(['Lazer', 'Zero'])
    expect(near.map((b) => [b.category.name, b.percent])).toEqual([['Mercado', 90], ['Exato', 80]])
  })
})

describe('avisos do Resumo', () => {
  it('com tudo ligado: caixinhas, salário e lembrete de MFA', async () => {
    const { user, onInformSalary } = renderAlerts()
    expect(screen.getByText('Caixinha estourada: Lazer.')).toBeInTheDocument()
    expect(screen.getByText('Caixinha perto do limite: Mercado (90%).')).toBeInTheDocument()
    expect(screen.getByText(/Você ainda não informou o salário de Novembro\/2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ativar agora' })).toHaveAttribute('href', '/profile?aba=seguranca')
    expect(screen.getByRole('link', { name: 'Escolher avisos' })).toHaveAttribute('href', '/profile?aba=preferencias')

    await user.click(screen.getByRole('button', { name: 'Informar agora' }))
    expect(onInformSalary).toHaveBeenCalled()
  })

  it('cada tipo some quando desligado nas preferências', () => {
    setPrefs({ notify_budget_alerts: false, notify_mfa_reminder: false })
    renderAlerts()
    expect(screen.queryByText(/Caixinha/)).not.toBeInTheDocument()
    expect(screen.queryByText(/verificação em duas etapas/)).not.toBeInTheDocument()
    expect(screen.getByText(/salário de Novembro/)).toBeInTheDocument()
  })

  it('MFA já ativado: sem lembrete', () => {
    setPrefs({}, true)
    renderAlerts({ budgets: [], salaryMissing: false })
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByText(/verificação em duas etapas/)).not.toBeInTheDocument()
  })

  it('tudo desligado: nada aparece', () => {
    setPrefs({ notify_budget_alerts: false, notify_missing_salary: false, notify_mfa_reminder: false })
    const { container } = render(
      <MemoryRouter>
        <DashboardAlerts budgets={BUDGETS} salaryMissing monthLabel="x" onInformSalary={() => {}} />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })
})

it('conta de demonstração: sem o lembrete de ativar a verificação em duas etapas (lá ela fica travada)', () => {
  setPrefs({}, false, true)
  renderAlerts()
  expect(screen.queryByRole('link', { name: /Ativar/i })).not.toBeInTheDocument()
  expect(screen.queryByText(/duas etapas/i)).not.toBeInTheDocument()
})
