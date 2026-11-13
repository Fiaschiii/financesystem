// Acesso ao banco para o perfil (tabela profiles), a foto (Storage) e as
// sessões ativas (funções da migração 0005).
//
// Toda função recebe o userId do TOKEN (req.user.id), nunca do cliente. Ele
// é o filtro de todas as consultas; o RLS do banco confere de novo.

import { randomUUID } from 'node:crypto'

export const AVATAR_BUCKET = 'avatars'
// Link da foto: privado e temporário (1 hora). O frontend pede o perfil de
// novo ao abrir a página, então o link nunca fica velho na tela por muito tempo.
const AVATAR_URL_TTL_SECONDS = 60 * 60

const SELECT =
  'full_name, phone, avatar_path, language, theme, ' +
  'notify_budget_alerts, notify_missing_salary, notify_mfa_reminder, dashboard_panels'

export async function getProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  // Conta sem perfil (ex.: o backfill da 0005 não rodou): cria com os padrões.
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select(SELECT)
    .single()

  if (insertError) throw insertError
  return created
}

// Atualiza só os campos enviados. O id gravado é o do token: `fields` já vem
// filtrado pelo controller e nunca traz id.
export async function updateProfile(supabase, userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...fields, id: userId }, { onConflict: 'id' })
    .select(SELECT)
    .single()

  if (error) throw error
  return data
}

// Conta de demonstração (migração 0007)? A função do banco responde só sobre
// quem está logado (auth.uid()), então nenhum id vai daqui.
// Se a 0007 ainda não foi rodada, a função não existe: aí nenhuma conta é de
// demonstração (e o resto do perfil continua funcionando).
export async function isDemoAccount(supabase) {
  const { data, error } = await supabase.rpc('is_demo_account')
  if (error) {
    if (error.code === 'PGRST202') return false
    throw error
  }
  return data === true
}

// ----------------------------- Foto -----------------------------

// Sempre um nome novo: o link antigo (que pode estar em cache) não mostra a foto nova.
export async function uploadAvatar(supabase, userId, { buffer, contentType, extension }) {
  const path = `${userId}/${randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType, upsert: false, cacheControl: '3600' })

  if (error) throw error
  return path
}

// Apaga um arquivo antigo. Só aceita caminhos da pasta do próprio usuário,
// mesmo que o valor tenha vindo do banco (defesa extra).
export async function removeAvatarFile(supabase, userId, path) {
  if (!path || !path.startsWith(`${userId}/`)) return
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
  // Sobrou um arquivo órfão: não é motivo para falhar a troca de foto.
  if (error) console.warn(`Não consegui apagar a foto antiga (${path}): ${error.message}`)
}

export async function signAvatarUrl(supabase, userId, path) {
  if (!path || !path.startsWith(`${userId}/`)) return null
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS)

  // Sem o link, o perfil continua abrindo (só sem a foto).
  if (error) {
    console.warn(`Não consegui gerar o link da foto (${path}): ${error.message}`)
    return null
  }
  return data.signedUrl
}

// ---------------------------- Sessões ----------------------------
// As funções do banco descobrem o dono pelo token (auth.uid()): nenhuma
// recebe id de usuário.

export async function listSessions(supabase) {
  const { data, error } = await supabase.rpc('list_my_sessions')
  if (error) throw error
  return data ?? []
}

// true se encerrou; false se não achou (inexistente, de outra pessoa ou a atual).
export async function revokeSession(supabase, sessionId) {
  const { data, error } = await supabase.rpc('revoke_my_session', { target_session_id: sessionId })
  if (error) throw error
  return data === true
}

export async function revokeOtherSessions(supabase) {
  const { data, error } = await supabase.rpc('revoke_my_other_sessions')
  if (error) throw error
  return Number(data) || 0
}
