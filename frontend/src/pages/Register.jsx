import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { translateAuthError } from '../utils/authErrors.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useCaptcha } from '../hooks/useCaptcha.jsx'
import { SignInIcon } from '@primer/octicons-react'
import { useI18n } from '../i18n/index.jsx'

function Register() {
  usePageTitle('register.title')
  const { t } = useI18n()
  useRouteReady(true)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const captcha = useCaptcha()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { data, error } = await signUp(email, password, captcha.token)
    setLoading(false)
    captcha.reset()

    if (error) {
      setError(translateAuthError(error))
      return
    }

    if (data.session) {
      navigate('/')
      return
    }

    setInfo(t('register.checkEmail'))
  }

  return (
    <section className="page page--auth">
      <h1>{t('register.title')}</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          {t('auth.email')}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t('auth.password')}
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {captcha.widget}
        {error && <p className="status status--error">{error}</p>}
        {info && <p className="status status--ok">{info}</p>}
        <button type="submit" disabled={loading || !captcha.ready}>
          {loading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
      <p className="auth-links">
        <Link to="/login"><SignInIcon size={16} /> {t('register.haveAccount')}</Link>
      </p>
    </section>
  )
}

export default Register
