import { useRef, useState } from 'react'
import Captcha from '../components/Captcha.jsx'
import { isCaptchaEnabled } from '../config/security.js'

// Junta o que as telas de login, cadastro e "esqueci a senha" precisam do
// CAPTCHA. Com ele desligado (sem VITE_TURNSTILE_SITE_KEY), widget é null,
// ready é sempre true e token fica vazio: as telas funcionam como antes.
export function useCaptcha() {
  const ref = useRef(null)
  const [token, setToken] = useState('')

  return {
    token,
    ready: !isCaptchaEnabled || token !== '',
    widget: isCaptchaEnabled ? <Captcha ref={ref} onToken={setToken} /> : null,
    // Depois de cada envio: o comprovante só vale uma vez.
    reset: () => ref.current?.reset(),
  }
}
