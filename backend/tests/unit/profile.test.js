import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parsePhone, parseOneOf, parseBoolean, ValidationError } from '../../src/utils/validators.js'
import { detectImageType } from '../../src/controllers/profileController.js'
import * as profileService from '../../src/services/profileService.js'
import { translateMessage, languageFromHeader } from '../../src/utils/i18n.js'
import { getTokenSessionId } from '../../src/utils/mfa.js'
import { fakeSupabase, eqFilters } from '../helpers/fakeSupabase.js'
import { USER, OTHER_USER_ID, SESSION_TOKEN, SESSION_ID } from '../helpers/constants.js'

describe('parsePhone', () => {
  it.each([
    ['(11) 98765-4321', '+5511987654321'],
    ['11987654321', '+5511987654321'],
    ['(11) 3456-7890', '+551134567890'],
    ['+55 11 98765-4321', '+5511987654321'],
    ['5511987654321', '+5511987654321'],
    ['+1 415 555 2671', '+14155552671'],
  ])('%s -> %s', (input, expected) => {
    expect(parsePhone(input)).toBe(expected)
  })

  it.each(['', '   ', null, undefined])('%j vira null (sem telefone)', (input) => {
    expect(parsePhone(input)).toBeNull()
  })

  it.each(['123', '98765-4321', 'abc', '+55 11 9876', '+0 11 98765-4321', '+55 11 987654321000', 11987654321, '<b>11</b>'])(
    'recusa %j',
    (input) => {
      expect(() => parsePhone(input)).toThrow(ValidationError)
    }
  )
})

describe('parseOneOf e parseBoolean', () => {
  it('aceita só valores da lista', () => {
    expect(parseOneOf('en', ['pt-BR', 'en'], 'Idioma')).toBe('en')
    expect(() => parseOneOf('EN', ['pt-BR', 'en'], 'Idioma')).toThrow('Idioma inválido: use "pt-BR", "en".')
  })

  it.each([true, false])('aceita %s', (value) => expect(parseBoolean(value, 'X')).toBe(value))
  it.each(['true', 1, 0, null, 'sim'])('recusa %j', (value) => expect(() => parseBoolean(value, 'X')).toThrow(ValidationError))
})

describe('detectImageType (pela assinatura do arquivo)', () => {
  it('reconhece JPEG, PNG e WebP', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 0, 0, 0, 0, 0, 0, 0]))?.extension).toBe('jpg')
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))?.extension).toBe('png')
    expect(detectImageType(Buffer.from('RIFF0000WEBPVP8 '))?.extension).toBe('webp')
  })

  it('recusa SVG (pode ter script), GIF, texto, corpo vazio e objeto JSON', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull()
    expect(detectImageType(Buffer.from('GIF89a000000000'))).toBeNull()
    expect(detectImageType(Buffer.alloc(0))).toBeNull()
    expect(detectImageType({})).toBeNull()
  })
})

describe('profileService', () => {
  it('getProfile filtra pelo id do usuário', async () => {
    const { client, queries } = fakeSupabase({ data: { full_name: 'Ana' }, error: null })
    await profileService.getProfile(client, USER.id)
    expect(queries[0].table).toBe('profiles')
    expect(eqFilters(queries[0])).toEqual({ id: USER.id })
  })

  it('getProfile cria o perfil com os padrões se ainda não existir', async () => {
    const { client, queries } = fakeSupabase({ data: null, error: null }, { data: { theme: 'auto' }, error: null })
    const profile = await profileService.getProfile(client, USER.id)
    expect(profile).toEqual({ theme: 'auto' })
    expect(queries[1].calls[0]).toEqual(['upsert', { id: USER.id }, { onConflict: 'id' }])
  })

  it('updateProfile grava com o id do usuário do token, por cima de qualquer id nos campos', async () => {
    const { client, queries } = fakeSupabase({ data: {}, error: null })
    await profileService.updateProfile(client, USER.id, { theme: 'dark', id: OTHER_USER_ID })
    expect(queries[0].calls[0][1]).toEqual({ theme: 'dark', id: USER.id })
  })

  it('isDemoAccount pergunta ao banco sem mandar id (o banco usa o do token)', async () => {
    const { client, queries } = fakeSupabase({ data: true, error: null })
    expect(await profileService.isDemoAccount(client)).toBe(true)
    expect(queries[0]).toEqual({ rpc: 'is_demo_account', args: undefined })
  })

  it('isDemoAccount: sem a migração 0007 (função inexistente), nenhuma conta é de demonstração', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: 'PGRST202', message: 'not found' } })
    expect(await profileService.isDemoAccount(client)).toBe(false)
  })

  it('isDemoAccount: outro erro do banco não é engolido', async () => {
    const { client } = fakeSupabase({ data: null, error: { code: '500', message: 'falhou' } })
    await expect(profileService.isDemoAccount(client)).rejects.toMatchObject({ message: 'falhou' })
  })

  it('uploadAvatar usa a pasta do usuário e um nome novo a cada envio', async () => {
    const { client, queries } = fakeSupabase({ error: null }, { error: null })
    const image = { buffer: Buffer.from('x'), contentType: 'image/jpeg', extension: 'jpg' }
    const first = await profileService.uploadAvatar(client, USER.id, image)
    const second = await profileService.uploadAvatar(client, USER.id, image)

    expect(first).toMatch(new RegExp(`^${USER.id}/[0-9a-f-]{36}\\.jpg$`))
    expect(second).not.toBe(first)
    expect(queries[0]).toMatchObject({ bucket: 'avatars', storage: 'upload' })
    expect(queries[0].args[2]).toMatchObject({ contentType: 'image/jpeg', upsert: false })
  })

  it('removeAvatarFile e signAvatarUrl não tocam em arquivos fora da pasta do usuário', async () => {
    const { client, queries } = fakeSupabase()
    await profileService.removeAvatarFile(client, USER.id, `${OTHER_USER_ID}/foto.jpg`)
    await profileService.removeAvatarFile(client, USER.id, `../${OTHER_USER_ID}/foto.jpg`)
    expect(await profileService.signAvatarUrl(client, USER.id, `${OTHER_USER_ID}/foto.jpg`)).toBeNull()
    expect(await profileService.signAvatarUrl(client, USER.id, null)).toBeNull()
    expect(queries).toHaveLength(0)
  })

  it('signAvatarUrl devolve o link temporário; se falhar, null (o perfil abre sem foto)', async () => {
    const path = `${USER.id}/foto.jpg`
    const { client, queries } = fakeSupabase(
      { data: { signedUrl: 'https://link' }, error: null },
      { data: null, error: { message: 'fora' } }
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await profileService.signAvatarUrl(client, USER.id, path)).toBe('https://link')
    expect(queries[0].args).toEqual([path, 3600])
    expect(await profileService.signAvatarUrl(client, USER.id, path)).toBeNull()
  })

  it('sessões: chama as funções do banco sem passar id de usuário', async () => {
    const { client, queries } = fakeSupabase(
      { data: [{ id: 's1' }], error: null },
      { data: true, error: null },
      { data: 3, error: null }
    )
    expect(await profileService.listSessions(client)).toEqual([{ id: 's1' }])
    expect(await profileService.revokeSession(client, SESSION_ID)).toBe(true)
    expect(await profileService.revokeOtherSessions(client)).toBe(3)
    expect(queries).toEqual([
      { rpc: 'list_my_sessions', args: undefined },
      { rpc: 'revoke_my_session', args: { target_session_id: SESSION_ID } },
      { rpc: 'revoke_my_other_sessions', args: undefined },
    ])
  })

  it('erros do banco sobem para o errorHandler', async () => {
    const { client } = fakeSupabase({ data: null, error: new Error('mfa_required') })
    await expect(profileService.revokeOtherSessions(client)).rejects.toThrow('mfa_required')
  })
})

describe('getTokenSessionId', () => {
  it('lê o session_id do token; token estranho dá null', () => {
    expect(getTokenSessionId(SESSION_TOKEN)).toBe(SESSION_ID)
    expect(getTokenSessionId('token-valido')).toBeNull()
  })
})

describe('tradução das mensagens da API', () => {
  it.each([
    ['en', 'en'],
    ['en-US,en;q=0.9', 'en'],
    ['EN-gb', 'en'],
    ['pt-BR,pt;q=0.9', 'pt-BR'],
    ['es', 'pt-BR'],
    [undefined, 'pt-BR'],
  ])('Accept-Language %j -> %s', (header, expected) => {
    expect(languageFromHeader(header)).toBe(expected)
  })

  it.each([
    ['Categoria não encontrada.', 'Category not found.'],
    ['Nome é obrigatório.', 'Name is required.'],
    ['Descrição muito longo (máximo de 120 caracteres).', 'Description is too long (120 characters maximum).'],
    ['Nome muito longo (máximo de 60 caracteres).', 'Name is too long (60 characters maximum).'],
    ['Valor inválido: informe um número maior que zero.', 'Invalid amount: enter a number greater than zero.'],
    ['Salário alto demais.', 'Salary is too high.'],
    ['Data inválida: esse dia não existe no calendário.', 'Invalid date: that day does not exist.'],
    ['Ano inválido: use um valor entre 2000 e 2100.', 'Invalid year: use a value between 2000 and 2100.'],
    ['Preferência de aviso inválido: use true ou false.', 'Invalid notification preference: use true or false.'],
    ['Telefone inválido.', 'Invalid phone.'],
    ['Mensagem que ninguém traduziu', 'Mensagem que ninguém traduziu'],
  ])('%s', (pt, en) => {
    expect(translateMessage(pt, 'en')).toBe(en)
  })

  it('em português, nada muda', () => {
    expect(translateMessage('Categoria não encontrada.', 'pt-BR')).toBe('Categoria não encontrada.')
  })
})

// Rede de segurança: toda mensagem de erro fixa escrita no código (error: '...',
// ValidationError('...'), message: '...' dos limites) precisa ter tradução.
// Se alguém criar uma mensagem nova e esquecer do inglês, este teste avisa.
describe('nenhuma mensagem de erro do backend fica sem tradução', () => {
  const SRC = join(import.meta.dirname, '../../src')
  const files = readdirSync(SRC, { recursive: true }).filter((file) => file.endsWith('.js') && !file.includes('i18n'))
  const messages = new Set()
  for (const file of files) {
    const code = readFileSync(join(SRC, file), 'utf8')
    for (const [, text] of code.matchAll(/(?:error:|ValidationError\(|message:|parseUuid\([^,\n)]+,)\s*'([^'$]+)'/g)) {
      if (/[áéíóúãõçâêô]|não|Informe|inválid/i.test(text) || /^[A-ZÁÉ][a-zà-ú]+ /.test(text)) messages.add(text)
    }
  }
  // Mensagens que não são erro para o usuário (só para quem configura o servidor).
  messages.delete('Backend do Controle Financeiro está no ar')
  messages.delete('Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em backend/.env')

  it('encontrou as mensagens', () => expect(messages.size).toBeGreaterThan(25))
  it.each([...messages])('%s', (message) => {
    expect(translateMessage(message, 'en')).not.toBe(message)
  })
})
