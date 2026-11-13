import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { apiFetch } from '../../src/services/api.js'
import { useAuth } from '../../src/hooks/useAuth.jsx'
import { ProfileProvider } from '../../src/hooks/useProfile.jsx'
import { ToastProvider } from '../../src/hooks/useToast.jsx'
import { I18nProvider, applyLanguage } from '../../src/i18n/index.jsx'
import Profile from '../../src/pages/Profile.jsx'
import Header from '../../src/components/Header.jsx'

vi.mock('../../src/services/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))

const USER = { id: 'u-ana', email: 'ana@exemplo.com', factors: [] }

let profile
let sessions
let auth

// Backend falso. Guarda o que o perfil recebeu, como o servidor faria.
async function fakeBackend(path, options = {}) {
  const method = options.method ?? 'GET'
  if (path === '/api/profile' && method === 'GET') return { profile }
  if (path === '/api/profile' && method === 'PUT') {
    profile = { ...profile, ...JSON.parse(options.body) }
    return { profile }
  }
  if (path === '/api/profile/avatar' && method === 'PUT') {
    profile = { ...profile, avatar_url: 'https://projeto.supabase.co/storage/v1/object/sign/avatars/nova.jpg' }
    return { profile }
  }
  if (path === '/api/profile/avatar' && method === 'DELETE') {
    profile = { ...profile, avatar_url: null }
    return { profile }
  }
  if (path === '/api/profile/sessions' && method === 'GET') return { sessions }
  if (path === '/api/profile/sessions' && method === 'DELETE') {
    const revoked = sessions.filter((s) => !s.is_current).length
    sessions = sessions.filter((s) => s.is_current)
    return { revoked }
  }
  if (path.startsWith('/api/profile/sessions/') && method === 'DELETE') {
    sessions = sessions.filter((s) => s.id !== path.split('/').pop())
    return null
  }
  throw new Error(`rota não simulada: ${method} ${path}`)
}

beforeEach(() => {
  profile = {
    full_name: 'Ana Souza',
    phone: '+5511987654321',
    avatar_url: null,
    email: USER.email,
    new_email: null,
    mfa_enabled: false,
    language: 'pt-BR',
    theme: 'auto',
    notify_budget_alerts: true,
    notify_missing_salary: true,
    notify_mfa_reminder: true,
  }
  sessions = [
    {
      id: 's-atual',
      is_current: true,
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/140.0',
      ip: '189.1.2.3',
      aal: 'aal1',
      last_active_at: '2026-11-09T20:00:00Z',
    },
    {
      id: 's-celular',
      is_current: false,
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',
      ip: '200.1.1.1',
      aal: 'aal1',
      last_active_at: '2026-11-08T10:00:00Z',
    },
    {
      id: 's-trabalho',
      is_current: false,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36',
      ip: '10.0.0.1',
      aal: 'aal1',
      last_active_at: '2026-11-01T10:00:00Z',
    },
  ]
  auth = {
    user: USER,
    mfaPending: false,
    signOut: vi.fn(),
    updatePassword: vi.fn(async () => ({ data: {}, error: null })),
    reauthenticate: vi.fn(async () => ({ data: {}, error: null })),
    updateEmail: vi.fn(async () => ({ data: {}, error: null })),
    listFactors: vi.fn(async () => ({ data: { all: [], totp: [] }, error: null })),
  }
  useAuth.mockImplementation(() => auth)
  apiFetch.mockImplementation(fakeBackend)
})

afterEach(() => {
  applyLanguage('pt-BR')
  delete document.documentElement.dataset.theme
  localStorage.clear()
})

let currentUrl
function UrlSpy() {
  const location = useLocation()
  currentUrl = location.pathname + location.search
  return null
}

function renderProfile(url = '/profile') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <I18nProvider initialLanguage="pt-BR">
        <ProfileProvider>
          <ToastProvider>
            <Header />
            <Profile />
            <UrlSpy />
          </ToastProvider>
        </ProfileProvider>
      </I18nProvider>
    </MemoryRouter>
  )
  return userEvent.setup()
}

// Nenhuma requisição do frontend manda id de usuário: quem decide o dono é o
// backend, pelo token.
function expectNoUserIdSent() {
  for (const [path, options] of apiFetch.mock.calls) {
    expect(path).not.toContain(USER.id)
    if (typeof options?.body === 'string') {
      const body = JSON.parse(options.body)
      for (const key of ['id', 'user_id', 'userId']) expect(body).not.toHaveProperty(key)
    }
  }
}

describe('Minha conta: abas', () => {
  it('abre em Dados cadastrais; a aba fica na URL', async () => {
    const user = renderProfile()
    expect(await screen.findByRole('tab', { name: 'Dados cadastrais' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByLabelText('Nome')).toHaveValue('Ana Souza')

    await user.click(screen.getByRole('tab', { name: 'Segurança' }))
    expect(currentUrl).toBe('/profile?aba=seguranca')
    expect(await screen.findByRole('heading', { name: 'Sessões ativas' })).toBeInTheDocument()
  })

  it('setas do teclado trocam de aba', async () => {
    const user = renderProfile()
    const first = await screen.findByRole('tab', { name: 'Dados cadastrais' })
    first.focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Preferências' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Preferências' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(first).toHaveAttribute('aria-selected', 'true')
  })

  it('aba inválida na URL cai na primeira', async () => {
    renderProfile('/profile?aba=hackear')
    expect(await screen.findByRole('tab', { name: 'Dados cadastrais' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Dados cadastrais', () => {
  it('telefone aparece no formato brasileiro e salva só nome e telefone (sem id)', async () => {
    const user = renderProfile()
    const phone = await screen.findByLabelText('Telefone')
    expect(phone).toHaveValue('(11) 98765-4321')

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Ana Maria')
    await user.clear(phone)
    await user.type(phone, '(21) 99999-0000')
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }))

    expect(await screen.findByText('Dados salvos.')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ full_name: 'Ana Maria', phone: '(21) 99999-0000' }),
    })
    expectNoUserIdSent()
  })

  it('o cabeçalho mostra a foto (ou iniciais) com "Meu Perfil" e leva para Minha conta', async () => {
    renderProfile()
    const link = await screen.findByRole('link', { name: /Meu Perfil/ })
    expect(link).toHaveAttribute('href', '/profile')
    await waitFor(() => expect(link).toHaveAttribute('title', 'Minha conta (Ana Souza)'))
    expect(within(link).getByText('AS')).toBeInTheDocument() // iniciais, sem foto
  })

  it('telefone claramente inválido nem sai do navegador', async () => {
    const user = renderProfile()
    const phone = await screen.findByLabelText('Telefone')
    await user.clear(phone)
    await user.type(phone, '123')
    await user.click(screen.getByRole('button', { name: 'Salvar dados' }))
    expect(screen.getByText(/Telefone inválido/)).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' }))
  })

  it('erro do backend aparece no formulário', async () => {
    apiFetch.mockImplementation(async (path, options) => {
      if (options?.method === 'PUT') throw new Error('Telefone inválido: informe DDD e número, por exemplo (11) 98765-4321.')
      return fakeBackend(path, options)
    })
    const user = renderProfile()
    await user.click(await screen.findByRole('button', { name: 'Salvar dados' }))
    expect(await screen.findByText(/informe DDD e número/)).toBeInTheDocument()
  })

  it('foto: envia a imagem como arquivo e mostra a nova; remover volta às iniciais', async () => {
    const user = renderProfile()
    await screen.findByLabelText('Nome')
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'eu.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Foto de perfil', { selector: 'input' }), file)

    expect(await screen.findByText('Foto atualizada.')).toBeInTheDocument()
    const [, options] = apiFetch.mock.calls.find(([path, o]) => path === '/api/profile/avatar' && o?.method === 'PUT')
    expect(options.headers).toEqual({ 'Content-Type': 'image/jpeg' })
    expect(options.body).toBeInstanceOf(Blob)
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', expect.stringContaining('nova.jpg'))

    await user.click(screen.getByRole('button', { name: 'Remover foto' }))
    expect(await screen.findByText('Foto removida.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveTextContent('AS')
  })

  it('foto em formato não aceito (GIF) é recusada antes de enviar', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderProfile()
    await screen.findByLabelText('Nome')
    await user.upload(screen.getByLabelText('Foto de perfil', { selector: 'input' }), new File(['GIF89a'], 'a.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Escolha uma imagem JPEG, PNG ou WebP.')).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalledWith('/api/profile/avatar', expect.anything())
  })
})

describe('E-mail', () => {
  it('pede a troca ao Supabase e avisa que falta confirmar pelo link', async () => {
    const user = renderProfile()
    await user.type(await screen.findByLabelText('Novo e-mail'), 'ana.nova@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Trocar e-mail' }))
    expect(auth.updateEmail).toHaveBeenCalledWith('ana.nova@exemplo.com')
    expect(await screen.findByText(/Enviamos um link de confirmação para ana.nova@exemplo.com/)).toBeInTheDocument()
  })

  it('o mesmo e-mail de agora não é enviado', async () => {
    const user = renderProfile()
    await user.type(await screen.findByLabelText('Novo e-mail'), 'ANA@exemplo.com')
    await user.click(screen.getByRole('button', { name: 'Trocar e-mail' }))
    expect(screen.getByText('Esse já é o seu e-mail.')).toBeInTheDocument()
    expect(auth.updateEmail).not.toHaveBeenCalled()
  })

  it('troca pendente aparece', async () => {
    auth.user = { ...USER, new_email: 'pendente@exemplo.com' }
    renderProfile()
    expect(await screen.findByText(/Troca pendente para pendente@exemplo.com/)).toBeInTheDocument()
  })
})

describe('Segurança: senha', () => {
  async function fillPassword(user, password, confirm = password) {
    await user.type(await screen.findByLabelText('Nova senha'), password)
    await user.type(screen.getByLabelText('Confirme a nova senha'), confirm)
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }))
  }

  it('confere tamanho e confirmação antes de enviar', async () => {
    const user = renderProfile('/profile?aba=seguranca')
    await fillPassword(user, 'curta')
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Nova senha'))
    await user.clear(screen.getByLabelText('Confirme a nova senha'))
    await fillPassword(user, 'senhaforte123', 'senhaforte124')
    expect(screen.getByText('As duas senhas não são iguais.')).toBeInTheDocument()
    expect(auth.updatePassword).not.toHaveBeenCalled()
  })

  it('troca a senha', async () => {
    const user = renderProfile('/profile?aba=seguranca')
    await fillPassword(user, 'senhaforte123')
    expect(auth.updatePassword).toHaveBeenCalledWith('senhaforte123', undefined)
    expect(await screen.findByText('Senha alterada.')).toBeInTheDocument()
  })

  it('quando o Supabase pede reautenticação: manda o código por e-mail e troca com ele', async () => {
    auth.updatePassword
      .mockResolvedValueOnce({ data: null, error: { code: 'reauthentication_needed', message: 'Password update requires reauthentication' } })
      .mockResolvedValueOnce({ data: {}, error: null })
    const user = renderProfile('/profile?aba=seguranca')
    await fillPassword(user, 'senhaforte123')

    expect(auth.reauthenticate).toHaveBeenCalled()
    await user.type(await screen.findByLabelText('Código recebido por e-mail'), '123456')
    await user.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    expect(auth.updatePassword).toHaveBeenLastCalledWith('senhaforte123', '123456')
    expect(await screen.findByText('Senha alterada.')).toBeInTheDocument()
  })

  it('senha igual à atual: mensagem traduzida', async () => {
    auth.updatePassword.mockResolvedValue({ data: null, error: { code: 'same_password', message: 'x' } })
    const user = renderProfile('/profile?aba=seguranca')
    await fillPassword(user, 'senhaforte123')
    expect(await screen.findByText('A nova senha precisa ser diferente da atual.')).toBeInTheDocument()
  })
})

describe('Segurança: sessões ativas', () => {
  it('lista os aparelhos, marca o atual e não deixa encerrar ele por aqui', async () => {
    renderProfile('/profile?aba=seguranca')
    expect(await screen.findByText('Firefox no Linux')).toBeInTheDocument()
    expect(screen.getByText('Safari no iOS')).toBeInTheDocument()
    expect(screen.getByText('Chrome no Windows')).toBeInTheDocument()
    expect(screen.getByText('Este aparelho')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar sessão: Firefox no Linux' })).not.toBeInTheDocument()
  })

  it('encerra uma sessão pelo id da SESSÃO (nunca do usuário), com confirmação', async () => {
    const user = renderProfile('/profile?aba=seguranca')
    await user.click(await screen.findByRole('button', { name: 'Encerrar sessão: Safari no iOS' }))
    await user.click(screen.getByRole('button', { name: 'Sim, encerrar' }))

    expect(apiFetch).toHaveBeenCalledWith('/api/profile/sessions/s-celular', { method: 'DELETE' })
    expect(await screen.findByText('Sessão encerrada.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Safari no iOS')).not.toBeInTheDocument())
    expectNoUserIdSent()
  })

  it('encerra todas as outras de uma vez', async () => {
    const user = renderProfile('/profile?aba=seguranca')
    await user.click(await screen.findByRole('button', { name: 'Encerrar todas as outras' }))
    await user.click(screen.getByRole('button', { name: 'Sim, encerrar' }))
    expect(apiFetch).toHaveBeenCalledWith('/api/profile/sessions', { method: 'DELETE' })
    expect(await screen.findByText('2 sessões encerradas.')).toBeInTheDocument()
    expect(await screen.findByText('Só esta sessão está ativa.')).toBeInTheDocument()
  })
})

describe('Preferências', () => {
  it('trocar o idioma salva no perfil e a tela inteira muda na hora', async () => {
    const user = renderProfile('/profile?aba=preferencias')
    await user.click(await screen.findByLabelText('English'))

    expect(apiFetch).toHaveBeenCalledWith('/api/profile', { method: 'PUT', body: JSON.stringify({ language: 'en' }) })
    expect(await screen.findByRole('heading', { name: 'My account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Summary/ })).toBeInTheDocument()
    expect(await screen.findByText('Preference saved.')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('se o servidor recusar, o idioma volta ao que era', async () => {
    apiFetch.mockImplementation(async (path, options) => {
      if (options?.method === 'PUT') throw new Error('Falhou')
      return fakeBackend(path, options)
    })
    const user = renderProfile('/profile?aba=preferencias')
    await user.click(await screen.findByLabelText('English'))
    expect(await screen.findByText('Falhou')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Minha conta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Português (Brasil)')).toBeChecked()
  })

  it('tema escuro é aplicado e salvo no perfil', async () => {
    const user = renderProfile('/profile?aba=preferencias')
    await user.click(await screen.findByLabelText('Escuro'))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(apiFetch).toHaveBeenCalledWith('/api/profile', { method: 'PUT', body: JSON.stringify({ theme: 'dark' }) })
    await waitFor(() => expect(screen.getByLabelText('Escuro')).toBeChecked())
  })

  it('desligar um aviso', async () => {
    const user = renderProfile('/profile?aba=preferencias')
    const checkbox = await screen.findByLabelText('Lembrete para ativar a verificação em duas etapas')
    expect(checkbox).toBeChecked()
    await user.click(checkbox)
    expect(apiFetch).toHaveBeenCalledWith('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ notify_mfa_reminder: false }),
    })
    await waitFor(() => expect(checkbox).not.toBeChecked())
  })

  it('o idioma e o tema salvos no perfil valem ao entrar (outro navegador)', async () => {
    profile = { ...profile, language: 'en', theme: 'dark' }
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'My account' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('conta de demonstração', () => {
  const LOCK = 'Conta de demonstração: esta parte fica travada para que todos os visitantes continuem conseguindo entrar.'

  beforeEach(() => {
    profile.is_demo = true
  })

  it('Dados cadastrais: foto, nome, telefone e e-mail desligados, com o aviso do motivo', async () => {
    renderProfile()
    expect(await screen.findAllByText(LOCK)).toHaveLength(2) // dados + e-mail
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeDisabled()
    expect(screen.getByLabelText('Nome')).toBeDisabled()
    expect(screen.getByLabelText('Telefone')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trocar e-mail' })).toBeDisabled()
  })

  it('Segurança: senha, ativar MFA e encerrar sessões desligados; a lista de sessões continua visível', async () => {
    renderProfile('/profile?aba=seguranca')
    expect(await screen.findByRole('button', { name: /Ativar/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeDisabled()
    expect(await screen.findByRole('button', { name: 'Encerrar sessão: Safari no iOS' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Encerrar todas as outras' })).toBeDisabled()
    expect(screen.getAllByText(LOCK).length).toBeGreaterThanOrEqual(3)
  })

  it('Preferências continuam livres', async () => {
    renderProfile('/profile?aba=preferencias')
    expect(await screen.findByLabelText('Escuro')).toBeEnabled()
    expect(screen.queryByText(LOCK)).not.toBeInTheDocument()
  })

  it('conta normal não vê aviso nem botões desligados', async () => {
    profile.is_demo = false
    renderProfile()
    expect(await screen.findByRole('button', { name: 'Salvar dados' })).toBeEnabled()
    expect(screen.queryByText(LOCK)).not.toBeInTheDocument()
  })
})
