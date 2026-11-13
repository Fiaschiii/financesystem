import { createClient } from '@supabase/supabase-js'
import { isMfaSatisfied, getTokenSessionId } from '../utils/mfa.js'
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js'

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env

// Valida o token enviado pelo frontend (Authorization: Bearer <token>) e,
// se for válido, disponibiliza:
// - req.user: dados do usuário autenticado
// - req.sessionId: id da sessão (aparelho) deste token
// - req.supabase: cliente do Supabase já "logado" como esse usuário —
//   qualquer consulta feita com ele respeita o RLS automaticamente,
//   sem precisar da chave secret em nenhum momento.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente' })
  }

  let user
  let supabase

  try {
    // Um cliente por requisição, sem guardar sessão: no servidor o "login"
    // é só o token que chegou nesta requisição.
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: fetchWithTimeout },
    })

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' })
    }

    user = data.user
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao validar autenticação' })
  }

  // Senha certa, mas a pessoa ativou o app autenticador e ainda não digitou
  // o código: o token é verdadeiro, só não basta. O banco (RLS, migração
  // 0004) tem a mesma regra, para quem tentar falar direto com o Supabase.
  if (!isMfaSatisfied(user, token)) {
    return res.status(403).json({
      error: 'Falta o código do app autenticador (verificação em duas etapas).',
      code: 'mfa_required',
    })
  }

  req.user = user
  req.sessionId = getTokenSessionId(token)
  req.supabase = supabase
  next()
}
