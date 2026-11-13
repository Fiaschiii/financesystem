import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { translateAuthError } from '../utils/authErrors.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useCaptcha } from '../hooks/useCaptcha.jsx'
import { LOGOUT_REASON_KEY } from '../components/IdleLogout.jsx'
import { IDLE_TIMEOUT_MINUTES } from '../config/security.js'
import { KeyIcon, PersonAddIcon } from '@primer/octicons-react'
import { useI18n } from '../i18n/index.jsx'

function Login() {
  usePageTitle('login.title')
  const { t } = useI18n()
  useRouteReady(true)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [idleNotice] = useState(takeIdleNotice)
  const [loading, setLoading] = useState(false)
  const captcha = useCaptcha()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password, captcha.token)
    setLoading(false)
    captcha.reset()
    if (error) {
      setError(translateAuthError(error))
      return
    }
    navigate('/')
  }

  return (
    <section className="page page--auth">
      <h1>{t('login.title')}</h1>
      {idleNotice && (
        <p className="status status--warning">{t('login.idle', { minutes: IDLE_TIMEOUT_MINUTES })}</p>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          {t('auth.email')}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t('auth.password')}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {captcha.widget}
        {error && <p className="status status--error">{error}</p>}
        <button type="submit" disabled={loading || !captcha.ready}>
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
      <p className="auth-links">
        <Link to="/forgot-password"><KeyIcon size={16} /> {t('login.forgot')}</Link>
        <Link to="/register"><PersonAddIcon size={16} /> {t('login.register')}</Link>
      </p>
    </section>
  )
}

// Lê (e apaga) o aviso deixado pelo IdleLogout: aparece uma vez só.
function takeIdleNotice() {
  try {
    const reason = sessionStorage.getItem(LOGOUT_REASON_KEY)
    sessionStorage.removeItem(LOGOUT_REASON_KEY)
    return reason === 'idle'
  } catch {
    return false
  }
}

export default Login
