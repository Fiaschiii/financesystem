import { t } from '../i18n/index.jsx'

// Carrega o script do Cloudflare Turnstile uma vez só, sob demanda (só nas
// telas que têm CAPTCHA). Devolve o objeto window.turnstile.
export const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loading = null

export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error(t('captcha.loadError'))))
    script.onerror = () => {
      loading = null // deixa tentar de novo depois
      reject(new Error(t('captcha.loadError')))
    }
    document.head.appendChild(script)
  })
  return loading
}
