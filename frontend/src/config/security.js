// Configurações de segurança do frontend, lidas do .env (ver .env.example).

// CAPTCHA (Cloudflare Turnstile) no login, no cadastro e no "esqueci minha
// senha". Vazio = sem CAPTCHA. Se ligar no Supabase, preencha aqui também.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
export const isCaptchaEnabled = Boolean(TURNSTILE_SITE_KEY)

// Minutos sem uso até a sessão ser encerrada (mínimo 2).
const idle = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES)
export const IDLE_TIMEOUT_MINUTES = Number.isFinite(idle) && idle >= 2 ? idle : 15

// Quanto tempo antes do fim aparece o aviso "Você ainda está aí?".
export const IDLE_WARNING_SECONDS = 60
