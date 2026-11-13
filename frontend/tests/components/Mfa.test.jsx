import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import MfaVerify from '../../src/pages/MfaVerify.jsx'
import MfaSettings from '../../src/components/MfaSettings.jsx'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

const VERIFIED = { id: 'f-ok', factor_type: 'totp', status: 'verified' }
const LEFTOVER = { id: 'f-velho', factor_type: 'totp', status: 'unverified' }
const factors = (...all) => ({
  data: { all, totp: all.filter((factor) => factor.status === 'verified') },
  error: null,
})

let auth
beforeEach(() => {
  auth = {
    user: { id: 'u1' },
    loading: false,
    mfaPending: true,
    listFactors: vi.fn(async () => factors(VERIFIED)),
    verifyTotp: vi.fn(async () => ({ data: {}, error: null })),
    enrollTotp: vi.fn(async () => ({
      data: { id: 'f-novo', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'JBSWY3DPEHPK3PXP' } },
      error: null,
    })),
    unenrollFactor: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => {}),
  }
  useAuth.mockImplementation(() => auth)
})

function renderVerify() {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/mfa', state: { from: { pathname: '/history' } } }]}>
      <Routes>
        <Route path="/mfa" element={<MfaVerify />} />
        <Route path="/history" element="Histórico" />
        <Route path="/" element="Resumo" />
        <Route path="/login" element="Tela de login" />
      </Routes>
    </MemoryRouter>
  )
  return userEvent.setup()
}

describe('tela do código (/mfa)', () => {
  it('código certo: confere com o app cadastrado e volta para onde a pessoa ia', async () => {
    const user = renderVerify()
    const button = screen.getByRole('button', { name: 'Verificar' })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('Código de 6 dígitos'), '123 456')
    expect(screen.getByLabelText('Código de 6 dígitos')).toHaveValue('123456')
    await user.click(button)

    expect(auth.verifyTotp).toHaveBeenCalledWith('f-ok', '123456')
    expect(await screen.findByText('Histórico')).toBeInTheDocument()
  })

  it('código errado: mensagem em português e campo limpo', async () => {
    auth.verifyTotp.mockResolvedValue({ data: null, error: { message: 'Invalid TOTP code entered' } })
    const user = renderVerify()
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByText(/Código incorreto ou expirado/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código de 6 dígitos')).toHaveValue('')
  })

  it('"Entrar com outra conta" sai e volta ao login', async () => {
    const user = renderVerify()
    await user.click(screen.getByRole('button', { name: 'Entrar com outra conta' }))
    expect(auth.signOut).toHaveBeenCalled()
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })

  it('sem pendência (já verificou ou não usa app): vai para o início', () => {
    auth.mfaPending = false
    renderVerify()
    expect(screen.getByText('Resumo')).toBeInTheDocument()
  })

  it('sem login: vai para o login', () => {
    auth.user = null
    renderVerify()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })
})

describe('Configurações > verificação em duas etapas', () => {
  function renderSettings() {
    render(<MfaSettings />)
    return userEvent.setup()
  }

  it('ativar: limpa cadastro pela metade, mostra QR Code e chave, confirma com o código', async () => {
    auth.listFactors.mockResolvedValue(factors(LEFTOVER))
    const user = renderSettings()

    await user.click(await screen.findByRole('button', { name: /Ativar/ }))
    expect(auth.unenrollFactor).toHaveBeenCalledWith('f-velho')
    expect(auth.enrollTotp).toHaveBeenCalled()
    expect(screen.getByRole('img', { name: /QR Code/ })).toHaveAttribute('src', 'data:image/svg+xml;utf-8,<svg/>')
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()

    auth.listFactors.mockResolvedValue(factors(VERIFIED))
    await user.type(screen.getByLabelText('Código de 6 dígitos'), '654321')
    await user.click(screen.getByRole('button', { name: 'Confirmar e ativar' }))

    expect(auth.verifyTotp).toHaveBeenCalledWith('f-novo', '654321')
    expect(await screen.findByText(/Ativada/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /QR Code/ })).not.toBeInTheDocument()
  })

  it('cancelar o cadastro apaga o app que ficou pela metade', async () => {
    auth.listFactors.mockResolvedValue(factors())
    const user = renderSettings()
    await user.click(await screen.findByRole('button', { name: /Ativar/ }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(auth.unenrollFactor).toHaveBeenCalledWith('f-novo')
    expect(screen.getByRole('button', { name: /Ativar/ })).toBeInTheDocument()
  })

  it('desativar pede confirmação', async () => {
    const user = renderSettings()
    await user.click(await screen.findByRole('button', { name: 'Desativar' }))
    expect(auth.unenrollFactor).not.toHaveBeenCalled()

    auth.listFactors.mockResolvedValue(factors())
    await user.click(screen.getByRole('button', { name: 'Sim, desativar' }))
    expect(auth.unenrollFactor).toHaveBeenCalledWith('f-ok')
    expect(await screen.findByRole('button', { name: /Ativar/ })).toBeInTheDocument()
  })

  it('TOTP desligado no Supabase: explica onde ligar', async () => {
    auth.listFactors.mockResolvedValue(factors())
    auth.enrollTotp.mockResolvedValue({ data: null, error: { message: 'MFA enroll is disabled for TOTP' } })
    const user = renderSettings()
    await user.click(await screen.findByRole('button', { name: /Ativar/ }))
    expect(await screen.findByText(/Authentication > Multi-Factor/)).toBeInTheDocument()
  })
})
