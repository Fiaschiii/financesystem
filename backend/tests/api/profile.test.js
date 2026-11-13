import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import * as profileService from '../../src/services/profileService.js'
import {
  USER,
  AUTH,
  OTHER_USER_ID,
  SESSION_AUTH,
  SESSION_ID,
  OTHER_SESSION_ID,
  MFA_AAL1_TOKEN,
} from '../helpers/constants.js'

vi.mock('../../src/services/profileService.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    AVATAR_BUCKET: original.AVATAR_BUCKET,
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    removeAvatarFile: vi.fn(),
    signAvatarUrl: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    isDemoAccount: vi.fn(),
  }
})

const PROFILE = {
  full_name: 'Ana Souza',
  phone: '+5511987654321',
  avatar_path: `${USER.id}/antiga.jpg`,
  language: 'pt-BR',
  theme: 'auto',
  notify_budget_alerts: true,
  notify_missing_salary: true,
  notify_mfa_reminder: true,
  dashboard_panels: null,
}

const PANELS = [
  { id: 'salary', icon: 'wallet' },
  { id: 'spent', icon: 'cart' },
  { id: 'balance', icon: 'scale' },
  { id: 'fixed', icon: 'pin' },
  { id: 'variable', icon: 'shuffle' },
  { id: 'percent', icon: 'percent' },
]

// Primeiros bytes reais de cada formato (o resto do arquivo não importa).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(60)])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(60)])

beforeEach(() => {
  profileService.getProfile.mockResolvedValue(PROFILE)
  profileService.updateProfile.mockImplementation(async (_s, _id, fields) => ({ ...PROFILE, ...fields }))
  profileService.signAvatarUrl.mockImplementation(async (_s, _id, path) => (path ? `https://assinado/${path}` : null))
  profileService.uploadAvatar.mockResolvedValue(`${USER.id}/nova.jpg`)
  profileService.isDemoAccount.mockResolvedValue(false)
})

describe('GET /api/profile', () => {
  it('exige login', async () => {
    const res = await request(app).get('/api/profile')
    expect(res.status).toBe(401)
    expect(profileService.getProfile).not.toHaveBeenCalled()
  })

  it('busca o perfil do usuário do TOKEN e junta o e-mail do login; não expõe o caminho da foto', async () => {
    const res = await request(app).get('/api/profile').set(AUTH)

    expect(res.status).toBe(200)
    expect(profileService.getProfile).toHaveBeenCalledWith(expect.anything(), USER.id)
    expect(res.body.profile).toMatchObject({
      full_name: 'Ana Souza',
      email: USER.email,
      new_email: null,
      mfa_enabled: false,
      avatar_url: `https://assinado/${USER.id}/antiga.jpg`,
    })
    expect(res.body.profile).not.toHaveProperty('avatar_path')
  })

  it('com MFA ativado, sessão só com a senha (aal1) não lê o perfil', async () => {
    const res = await request(app).get('/api/profile').set({ Authorization: `Bearer ${MFA_AAL1_TOKEN}` })
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('mfa_required')
    expect(profileService.getProfile).not.toHaveBeenCalled()
  })
})

describe('PUT /api/profile', () => {
  it('atualiza nome, telefone (normalizado) e preferências do usuário do token', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).send({
      full_name: '  Ana Maria  ',
      phone: '(11) 91234-5678',
      language: 'en',
      theme: 'dark',
      notify_budget_alerts: false,
    })

    expect(res.status).toBe(200)
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, {
      full_name: 'Ana Maria',
      phone: '+5511912345678',
      language: 'en',
      theme: 'dark',
      notify_budget_alerts: false,
    })
    expect(res.body.profile.theme).toBe('dark')
  })

  it('nome e telefone vazios viram null (remover)', async () => {
    await request(app).put('/api/profile').set(AUTH).send({ full_name: '', phone: '' })
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, {
      full_name: null,
      phone: null,
    })
  })

  it('ignora campos que o cliente não pode mudar (caminho da foto, datas, e-mail)', async () => {
    await request(app).put('/api/profile').set(AUTH).send({
      theme: 'light',
      avatar_path: `${OTHER_USER_ID}/foto.jpg`,
      created_at: '2000-01-01',
      email: 'outra@exemplo.com',
    })
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, { theme: 'light' })
  })

  it('salva a ordem e os ícones dos painéis do resumo, descartando campos extras', async () => {
    const panels = [...PANELS].reverse().map((panel, index) => (index === 0 ? { ...panel, icon: 'star', extra: 'x' } : panel))
    const res = await request(app).put('/api/profile').set(AUTH).send({ dashboard_panels: panels })

    expect(res.status).toBe(200)
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, {
      dashboard_panels: [{ id: 'percent', icon: 'star' }, ...[...PANELS].reverse().slice(1)],
    })
  })

  it('dashboard_panels null volta ao padrão', async () => {
    await request(app).put('/api/profile').set(AUTH).send({ dashboard_panels: null })
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, { dashboard_panels: null })
  })

  it.each([
    [{ language: 'fr' }, 'Idioma inválido'],
    [{ theme: 'roxo' }, 'Tema inválido'],
    [{ phone: '123' }, 'Telefone inválido'],
    [{ phone: 'abc' }, 'Telefone inválido'],
    [{ full_name: 'a'.repeat(101) }, 'Nome muito longo'],
    [{ notify_mfa_reminder: 'sim' }, 'Preferência de aviso inválido'],
    [{ dashboard_panels: 'salary' }, 'Painéis do resumo inválidos'],
    [{ dashboard_panels: PANELS.slice(1) }, 'Painéis do resumo inválidos'],
    [{ dashboard_panels: [...PANELS.slice(1), PANELS[1]] }, 'Painéis do resumo inválidos'],
    [{ dashboard_panels: [...PANELS.slice(1), { id: 'admin', icon: 'star' }] }, 'Painéis do resumo inválidos'],
    [{ dashboard_panels: [...PANELS.slice(1), 'salary'] }, 'Painéis do resumo inválidos'],
    [{ dashboard_panels: [...PANELS.slice(1), { id: 'salary', icon: '<svg>' }] }, 'Ícone inválido'],
    [{}, 'Informe ao menos um campo'],
  ])('valida %j', async (body, message) => {
    const res = await request(app).put('/api/profile').set(AUTH).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toContain(message)
    expect(profileService.updateProfile).not.toHaveBeenCalled()
  })
})

// Regra de segurança da etapa: o backend usa sempre o id do usuário da
// SESSÃO. Usuário A não altera nada do usuário B mexendo na URL ou no corpo.
describe('segurança: o dono é sempre o usuário do token', () => {
  it.each(['id', 'user_id', 'userId', 'owner_id'])(
    'corpo com %s de OUTRA pessoa: 403, nada é gravado',
    async (key) => {
      const res = await request(app)
        .put('/api/profile')
        .set(AUTH)
        .send({ [key]: OTHER_USER_ID, full_name: 'Invasor' })

      expect(res.status).toBe(403)
      expect(res.body.code).toBe('forbidden_user')
      expect(profileService.updateProfile).not.toHaveBeenCalled()
    }
  )

  it('id de outra pessoa na query também é recusado (inclusive na leitura)', async () => {
    const res = await request(app).get(`/api/profile?user_id=${OTHER_USER_ID}`).set(AUTH)
    expect(res.status).toBe(403)
    expect(profileService.getProfile).not.toHaveBeenCalled()
  })

  it('a tentativa fica registrada no log do servidor', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await request(app).put('/api/profile').set(AUTH).send({ user_id: OTHER_USER_ID, theme: 'dark' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`usuário ${USER.id} tentou usar user_id="${OTHER_USER_ID}"`))
  })

  it('o próprio id no corpo é tolerado, mas não é usado: vale o do token', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).send({ user_id: USER.id, theme: 'dark' })
    expect(res.status).toBe(200)
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, { theme: 'dark' })
  })

  it.each([
    ['get', `/api/profile/${OTHER_USER_ID}`],
    ['put', `/api/profile/${OTHER_USER_ID}`],
    ['delete', `/api/profile/${OTHER_USER_ID}`],
    ['put', `/api/profile/${OTHER_USER_ID}/avatar`],
  ])('não existe rota com id de usuário: %s %s dá 404 sem tocar no banco', async (method, url) => {
    const res = await request(app)[method](url).set(AUTH).send({ full_name: 'Invasor' })
    expect(res.status).toBe(404)
    expect(profileService.getProfile).not.toHaveBeenCalled()
    expect(profileService.updateProfile).not.toHaveBeenCalled()
  })

  it('JSON forjado em várias camadas ({ profile: { id } }) não muda o dono', async () => {
    await request(app)
      .put('/api/profile')
      .set(AUTH)
      .send({ theme: 'dark', profile: { id: OTHER_USER_ID }, user: { id: OTHER_USER_ID } })
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, { theme: 'dark' })
  })
})

describe('PUT /api/profile/avatar', () => {
  it.each([
    ['image/jpeg', JPEG, 'jpg'],
    ['image/png', PNG, 'png'],
    ['image/webp', WEBP, 'webp'],
  ])('%s: sobe na pasta do usuário do token, grava e apaga a foto antiga', async (type, body, extension) => {
    const res = await request(app).put('/api/profile/avatar').set(AUTH).set('Content-Type', type).send(body)

    expect(res.status).toBe(200)
    expect(profileService.uploadAvatar).toHaveBeenCalledWith(
      expect.anything(),
      USER.id,
      expect.objectContaining({ contentType: type, extension })
    )
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, {
      avatar_path: `${USER.id}/nova.jpg`,
    })
    expect(profileService.removeAvatarFile).toHaveBeenCalledWith(expect.anything(), USER.id, `${USER.id}/antiga.jpg`)
    expect(res.body.profile.avatar_url).toBe(`https://assinado/${USER.id}/nova.jpg`)
  })

  it('confere o conteúdo, não o Content-Type: texto disfarçado de JPEG é recusado', async () => {
    const res = await request(app)
      .put('/api/profile/avatar')
      .set(AUTH)
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.from('<script>alert(1)</script> isto não é uma imagem'))
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Foto inválida')
    expect(profileService.uploadAvatar).not.toHaveBeenCalled()
  })

  it('formato fora da lista (GIF) é recusado', async () => {
    const res = await request(app)
      .put('/api/profile/avatar')
      .set(AUTH)
      .set('Content-Type', 'image/gif')
      .send(Buffer.from('GIF89a................'))
    expect(res.status).toBe(400)
    expect(profileService.uploadAvatar).not.toHaveBeenCalled()
  })

  it('acima de 2 MB: 413 com mensagem própria', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(2 * 1024 * 1024)])
    const res = await request(app).put('/api/profile/avatar').set(AUTH).set('Content-Type', 'image/jpeg').send(big)
    expect(res.status).toBe(413)
    expect(res.body.error).toBe('Foto grande demais (máximo de 2 MB).')
    expect(profileService.uploadAvatar).not.toHaveBeenCalled()
  })

  it('se gravar no perfil falhar, apaga o arquivo novo (nada fica perdido no bucket)', async () => {
    profileService.updateProfile.mockRejectedValue(new Error('banco fora'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app).put('/api/profile/avatar').set(AUTH).set('Content-Type', 'image/jpeg').send(JPEG)
    expect(res.status).toBe(500)
    expect(profileService.removeAvatarFile).toHaveBeenCalledWith(expect.anything(), USER.id, `${USER.id}/nova.jpg`)
    expect(profileService.removeAvatarFile).not.toHaveBeenCalledWith(expect.anything(), USER.id, `${USER.id}/antiga.jpg`)
  })
})

describe('DELETE /api/profile/avatar', () => {
  it('limpa o caminho e apaga o arquivo do usuário do token', async () => {
    const res = await request(app).delete('/api/profile/avatar').set(AUTH)
    expect(res.status).toBe(200)
    expect(profileService.updateProfile).toHaveBeenCalledWith(expect.anything(), USER.id, { avatar_path: null })
    expect(profileService.removeAvatarFile).toHaveBeenCalledWith(expect.anything(), USER.id, `${USER.id}/antiga.jpg`)
    expect(res.body.profile.avatar_url).toBeNull()
  })
})

describe('sessões ativas', () => {
  it('GET lista as sessões (as funções do banco descobrem o dono pelo token)', async () => {
    profileService.listSessions.mockResolvedValue([{ id: SESSION_ID, is_current: true }])
    const res = await request(app).get('/api/profile/sessions').set(SESSION_AUTH)
    expect(res.status).toBe(200)
    expect(res.body.sessions).toEqual([{ id: SESSION_ID, is_current: true }])
  })

  it('DELETE /:sessionId encerra outra sessão (204)', async () => {
    profileService.revokeSession.mockResolvedValue(true)
    const res = await request(app).delete(`/api/profile/sessions/${OTHER_SESSION_ID}`).set(SESSION_AUTH)
    expect(res.status).toBe(204)
    expect(profileService.revokeSession).toHaveBeenCalledWith(expect.anything(), OTHER_SESSION_ID)
  })

  it('sessão inexistente ou de outra pessoa: 404 (mesma resposta, não revela qual)', async () => {
    profileService.revokeSession.mockResolvedValue(false)
    const res = await request(app).delete(`/api/profile/sessions/${OTHER_SESSION_ID}`).set(SESSION_AUTH)
    expect(res.status).toBe(404)
  })

  it('a sessão atual não se encerra por aqui (é o Sair)', async () => {
    const res = await request(app).delete(`/api/profile/sessions/${SESSION_ID}`).set(SESSION_AUTH)
    expect(res.status).toBe(400)
    expect(profileService.revokeSession).not.toHaveBeenCalled()
  })

  it('id inválido: 400', async () => {
    const res = await request(app).delete('/api/profile/sessions/abc').set(SESSION_AUTH)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Sessão inválida.')
  })

  it('DELETE / encerra todas as outras e diz quantas', async () => {
    profileService.revokeOtherSessions.mockResolvedValue(2)
    const res = await request(app).delete('/api/profile/sessions').set(SESSION_AUTH)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ revoked: 2 })
  })
})

describe('idioma das mensagens (Accept-Language)', () => {
  it('em inglês, traduz o erro de validação', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).set('Accept-Language', 'en-US').send({ phone: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid phone: enter the area code and number, for example (11) 98765-4321.')
  })

  it('em inglês, traduz o 403 de conta alheia e o 401 sem token', async () => {
    const forbidden = await request(app)
      .put('/api/profile')
      .set(AUTH)
      .set('Accept-Language', 'en')
      .send({ user_id: OTHER_USER_ID })
    expect(forbidden.body.error).toBe('You can only view and change your own account.')

    const anonymous = await request(app).get('/api/profile').set('Accept-Language', 'en')
    expect(anonymous.body.error).toBe('Missing authentication token')
  })

  it('sem cabeçalho (ou pt-BR): continua em português', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).send({ theme: 'roxo' })
    expect(res.body.error).toBe('Tema inválido: use "auto", "light", "dark".')
  })
})

// Conta de demonstração do portfólio: todo visitante entra com ela. O que
// poderia trancar os outros ou expor algo ofensivo é recusado (403).
describe('conta de demonstração', () => {
  beforeEach(() => {
    profileService.isDemoAccount.mockResolvedValue(true)
  })

  function expectDemoLocked(res) {
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Indisponível na conta de demonstração.', code: 'demo_locked' })
  }

  it('o perfil avisa a tela que a conta é de demonstração', async () => {
    const res = await request(app).get('/api/profile').set(AUTH)
    expect(res.body.profile.is_demo).toBe(true)
  })

  it('conta normal: is_demo false', async () => {
    profileService.isDemoAccount.mockResolvedValue(false)
    const res = await request(app).get('/api/profile').set(AUTH)
    expect(res.body.profile.is_demo).toBe(false)
  })

  it.each([{ full_name: 'Ofensivo' }, { phone: '(11) 91234-5678' }, { full_name: 'X', theme: 'dark' }])(
    'não muda nome nem telefone: %j',
    async (body) => {
      expectDemoLocked(await request(app).put('/api/profile').set(AUTH).send(body))
      expect(profileService.updateProfile).not.toHaveBeenCalled()
    }
  )

  it('preferências e painéis continuam livres', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).send({ theme: 'dark', language: 'en', notify_budget_alerts: false })
    expect(res.status).toBe(200)
    expect(profileService.updateProfile).toHaveBeenCalled()
  })

  it('não envia foto (nem chega ao Storage)', async () => {
    expectDemoLocked(await request(app).put('/api/profile/avatar').set(AUTH).set('Content-Type', 'image/jpeg').send(JPEG))
    expect(profileService.uploadAvatar).not.toHaveBeenCalled()
  })

  it('não remove foto', async () => {
    expectDemoLocked(await request(app).delete('/api/profile/avatar').set(AUTH))
    expect(profileService.updateProfile).not.toHaveBeenCalled()
    expect(profileService.removeAvatarFile).not.toHaveBeenCalled()
  })

  it('não encerra a sessão de outro visitante nem "todas as outras"', async () => {
    expectDemoLocked(await request(app).delete(`/api/profile/sessions/${OTHER_SESSION_ID}`).set(SESSION_AUTH))
    expectDemoLocked(await request(app).delete('/api/profile/sessions').set(SESSION_AUTH))
    expect(profileService.revokeSession).not.toHaveBeenCalled()
    expect(profileService.revokeOtherSessions).not.toHaveBeenCalled()
  })

  it('ver as sessões continua permitido', async () => {
    profileService.listSessions.mockResolvedValue([])
    expect((await request(app).get('/api/profile/sessions').set(SESSION_AUTH)).status).toBe(200)
  })

  it('se a trava do BANCO recusar algo, a resposta é 403 com a mesma mensagem (não 500)', async () => {
    profileService.isDemoAccount.mockResolvedValue(false)
    profileService.updateProfile.mockRejectedValue(Object.assign(new Error('demo_account_locked'), { code: '42501' }))
    expectDemoLocked(await request(app).put('/api/profile').set(AUTH).send({ full_name: 'X' }))
  })

  it('em inglês', async () => {
    const res = await request(app).put('/api/profile').set(AUTH).set('Accept-Language', 'en').send({ full_name: 'X' })
    expect(res.body.error).toBe('Not available on the demo account.')
  })
})
