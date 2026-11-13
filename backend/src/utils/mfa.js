// Verificação em duas etapas (MFA): o Supabase grava no token o "nível de
// garantia" da sessão, no campo "aal":
// - aal1: entrou só com e-mail e senha;
// - aal2: entrou com senha E com o código do app autenticador.

// Lê um campo do token. Não confere a assinatura: isso já foi feito pelo
// supabase.auth.getUser(token) antes desta função ser chamada.
function getTokenClaim(token, name) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload[name] === 'string' ? payload[name] : null
  } catch {
    return null
  }
}

export function getTokenAal(token) {
  return getTokenClaim(token, 'aal')
}

// Id da sessão (aparelho/navegador) a que o token pertence. Usado em
// Minha conta > Sessões ativas, para marcar "este aparelho".
export function getTokenSessionId(token) {
  return getTokenClaim(token, 'session_id')
}

// O usuário tem algum app autenticador confirmado? (Um app só lido no QR
// Code, mas nunca confirmado com um código, não conta.)
export function hasVerifiedFactor(user) {
  return Boolean(user?.factors?.some((factor) => factor.status === 'verified'))
}

// Quem ativou a verificação em duas etapas precisa estar em aal2.
export function isMfaSatisfied(user, token) {
  return !hasVerifiedFactor(user) || getTokenAal(token) === 'aal2'
}
