// Identificadores fixos usados nos testes.
export const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'ana@exemplo.com' }
export const VALID_TOKEN = 'token-valido'
export const CRASH_TOKEN = 'token-que-derruba-o-supabase'

// Verificação em duas etapas: um usuário que ativou o app autenticador e
// tokens no formato JWT (cabeçalho.conteúdo.assinatura) com cada nível.
export const MFA_USER = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'bia@exemplo.com',
  factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
}
export function fakeJwt(claims) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}.assinatura`
}
export const MFA_AAL1_TOKEN = fakeJwt({ sub: MFA_USER.id, aal: 'aal1' })
export const MFA_AAL2_TOKEN = fakeJwt({ sub: MFA_USER.id, aal: 'aal2' })

export const CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
export const FINANCE_ID = '33333333-3333-4333-8333-333333333333'
export const EXPENSE_ID = '44444444-4444-4444-8444-444444444444'
export const BUDGET_ID = '55555555-5555-4555-8555-555555555555'

export const AUTH = { Authorization: `Bearer ${VALID_TOKEN}` }

// Perfil (Etapa 18): outra pessoa (alvo de quem tenta editar a conta alheia)
// e um token com o id da sessão (aparelho) dentro, como os do Supabase.
export const OTHER_USER_ID = '77777777-7777-4777-8777-777777777777'
export const SESSION_ID = '88888888-8888-4888-8888-888888888888'
export const OTHER_SESSION_ID = '99999999-9999-4999-8999-999999999999'
export const SESSION_TOKEN = fakeJwt({ sub: USER.id, session_id: SESSION_ID, aal: 'aal1' })
export const SESSION_AUTH = { Authorization: `Bearer ${SESSION_TOKEN}` }
