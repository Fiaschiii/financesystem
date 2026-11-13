import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TURNSTILE_SITE_KEY } from '../config/security.js'
import { loadTurnstile } from '../utils/turnstile.js'
import { getTheme } from '../utils/theme.js'
import { getLanguage } from '../i18n/index.jsx'

// Verificação anti-robô (Cloudflare Turnstile). Quase sempre se resolve
// sozinha, sem a pessoa clicar em nada; quando termina, chama onToken com o
// "comprovante" que vai junto no login. O Supabase confere esse comprovante.
//
// Cada comprovante vale para UMA tentativa: depois de enviar o formulário
// (dando certo ou não), chame ref.current.reset() para gerar outro.
const Captcha = forwardRef(function Captcha({ onToken }, ref) {
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const onTokenRef = useRef(onToken)
  const [error, setError] = useState('')
  onTokenRef.current = onToken

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current('')
      if (widgetRef.current !== null) window.turnstile?.reset(widgetRef.current)
    },
  }))

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: getLanguage() === 'en' ? 'en' : 'pt-br',
          theme: getTheme(), // 'auto', 'light' ou 'dark', igual ao do sistema
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => {
            onTokenRef.current('')
            // true = o Turnstile tenta de novo sozinho.
            return false
          },
        })
      })
      .catch((err) => !cancelled && setError(err.message))

    return () => {
      cancelled = true
      if (widgetRef.current !== null) {
        window.turnstile?.remove(widgetRef.current)
        widgetRef.current = null
      }
    }
  }, [])

  return (
    <div className="captcha">
      <div ref={containerRef} />
      {error && <p className="status status--error">{error}</p>}
    </div>
  )
})

export default Captcha
