// Verificação em duas etapas (MFA) com app autenticador (TOTP), como o
// Microsoft Authenticator.
//
// O Supabase marca cada sessão com um "nível de garantia" (aal):
// - aal1: entrou só com e-mail e senha;
// - aal2: entrou com senha E com o código de 6 dígitos do app.
// Quem tem um app autenticador cadastrado precisa estar em aal2 para usar
// o sistema; quem não tem fica em aal1 normalmente.

// Lê o "miolo" (payload) de um JWT sem conferir a assinatura. Só serve para
// decidir o que mostrar na tela: quem confere o token de verdade é o
// Supabase (e o backend, a cada requisição).
export function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      Array.from(atob(base64), (char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function hasVerifiedFactor(user) {
  return Boolean(user?.factors?.some((factor) => factor.status === 'verified'))
}

// Mesmo cálculo do supabase.auth.mfa.getAuthenticatorAssuranceLevel(), mas
// síncrono: dá para decidir a rota no mesmo instante em que a sessão muda,
// sem um "piscar" de tela privada antes de pedir o código.
export function getAssuranceLevel(session) {
  if (!session) return { currentLevel: null, nextLevel: null }
  const currentLevel = decodeJwtPayload(session.access_token)?.aal ?? 'aal1'
  const nextLevel = hasVerifiedFactor(session.user) ? 'aal2' : currentLevel
  return { currentLevel, nextLevel }
}

// Logado com senha, mas ainda falta o código do app.
export function isMfaPending(session) {
  const { currentLevel, nextLevel } = getAssuranceLevel(session)
  return nextLevel === 'aal2' && currentLevel !== 'aal2'
}

// O Supabase devolve o QR Code como "data:image/svg+xml;..." (versões
// antigas mandavam o SVG puro). Em qualquer caso vira algo que o <img> aceita.
export function qrCodeSrc(qrCode) {
  if (!qrCode) return ''
  if (qrCode.startsWith('data:')) return qrCode
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`
}

// "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP": mais fácil de digitar no app.
export function formatSecret(secret) {
  return (secret ?? '').replace(/(.{4})(?=.)/g, '$1 ')
}

// Aceita "123 456" ou "123-456" colado do app; devolve só os dígitos.
export function normalizeCode(value) {
  return (value ?? '').replace(/\D/g, '').slice(0, 6)
}
