import { t } from '../i18n/index.jsx'

// Mensagens do Supabase Auth (sempre em inglês) traduzidas para o idioma da
// interface. Primeiro pelo código do erro (error.code, quando vem), depois
// pela mensagem exata e, por fim, por padrões com números no meio.

const ERROR_CODES = {
  same_password: 'authError.samePassword',
  weak_password: 'authError.weakPassword',
  email_exists: 'authError.emailInUse',
  email_address_invalid: 'authError.invalidEmail',
  validation_failed: 'authError.invalidEmail',
  reauthentication_not_valid: 'authError.invalidNonce',
  session_not_found: 'authError.sessionMissing',
}

const ERROR_MESSAGES = {
  'Invalid login credentials': 'authError.invalidCredentials',
  'User already registered': 'authError.alreadyRegistered',
  'Email not confirmed': 'authError.emailNotConfirmed',
  'Invalid TOTP code entered': 'authError.invalidTotp',
  'Failed to fetch': 'authError.failedFetch',
  'New password should be different from the old password.': 'authError.samePassword',
  'A user with this email address has already been registered': 'authError.emailInUse',
  'Auth session missing!': 'authError.sessionMissing',
}

// Mensagens do Supabase que trazem um número no meio (o mínimo de caracteres
// depende do que estiver configurado no painel; o tempo de espera, do limite).
const ERROR_PATTERNS = [
  [/Password should be at least (\d+) characters/i, 'authError.passwordLength'],
  [/you can only request this after (\d+) seconds/i, 'authError.wait'],
  [/captcha/i, 'authError.captcha'],
  [/MFA enroll is disabled/i, 'authError.mfaDisabled'],
  [/rate limit exceeded/i, 'authError.rateLimit'],
  [/weak and easy to guess|password is known to be weak/i, 'authError.weakPassword'],
  [/invalid format|Unable to validate email address/i, 'authError.invalidEmail'],
  [/nonce|reauthentication/i, 'authError.invalidNonce'],
]

// Aceita a mensagem (texto) ou o próprio erro do Supabase ({ message, code }).
export function translateAuthError(errorOrMessage) {
  const message = typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage?.message
  const code = typeof errorOrMessage === 'object' ? errorOrMessage?.code : undefined

  if (code && ERROR_CODES[code]) return t(ERROR_CODES[code])
  if (ERROR_MESSAGES[message]) return t(ERROR_MESSAGES[message])
  for (const [pattern, key] of ERROR_PATTERNS) {
    const match = pattern.exec(message ?? '')
    if (match) return t(key, { n: match[1] })
  }
  return message || t('common.genericError')
}
