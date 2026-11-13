import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { translateAuthError } from '../utils/authErrors.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useCaptcha } from '../hooks/useCaptcha.jsx'
import { ArrowLeftIcon } from '@primer/octicons-react'
import { useI18n } from '../i18n/index.jsx'

function ForgotPassword() {
  usePageTitle('forgot.title')
  const { t } = useI18n()
  useRouteReady(true)
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const captcha = useCaptcha()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(email, captcha.token)
    setLoading(false)
    captcha.reset()
    if (error) {
      setError(translateAuthError(error))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <section className="page page--auth">
        <h1>{t('forgot.sentTitle')}</h1>
        <p>{t('forgot.sent', { email })}</p>
        <p className="auth-links"><Link to="/login"><ArrowLeftIcon size={16} /> {t('forgot.back')}</Link></p>
      </section>
    )
  }

  return (
    <section className="page page--auth">
      <h1>{t('forgot.title')}</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          {t('auth.email')}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {captcha.widget}
        {error && <p className="status status--error">{error}</p>}
        <button type="submit" disabled={loading || !captcha.ready}>
          {loading ? t('forgot.submitting') : t('forgot.submit')}
        </button>
      </form>
      <p className="auth-links"><Link to="/login"><ArrowLeftIcon size={16} /> {t('forgot.back')}</Link></p>
    </section>
  )
}

export default ForgotPassword
