import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { translateAuthError } from '../utils/authErrors.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useI18n } from '../i18n/index.jsx'

function ResetPassword() {
  usePageTitle('reset.pageTitle')
  const { t } = useI18n()
  useRouteReady(true)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setError(translateAuthError(error))
      return
    }
    navigate('/')
  }

  return (
    <section className="page page--auth">
      <h1>{t('reset.title')}</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          {t('reset.newPassword')}
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <p className="status status--error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('common.saving') : t('reset.submit')}
        </button>
      </form>
    </section>
  )
}

export default ResetPassword
