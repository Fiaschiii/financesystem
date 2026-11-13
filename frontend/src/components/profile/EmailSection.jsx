import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useProfile } from '../../hooks/useProfile.jsx'
import DemoLockNotice from '../DemoLockNotice.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { translateAuthError } from '../../utils/authErrors.js'

// Minha conta > E-mail. A troca é feita pelo Supabase Auth, que identifica a
// conta pelo token da sessão (nunca por um id enviado aqui) e manda um link
// de confirmação: o e-mail só muda depois do clique.
function EmailSection() {
  const { t } = useI18n()
  const { user, updateEmail } = useAuth()
  const { isDemo } = useProfile()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')

  const pending = sentTo || user?.new_email

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const value = email.trim()
    if (value.toLowerCase() === user?.email?.toLowerCase()) return setError(t('email.same'))

    setSending(true)
    const { error: updateError } = await updateEmail(value)
    setSending(false)
    if (updateError) return setError(translateAuthError(updateError))

    setSentTo(value)
    setEmail('')
  }

  return (
    <div className="settings-section">
      <h2>{t('email.title')}</h2>
      <p>{t('email.intro')}</p>

      <dl className="profile-facts">
        <dt>{t('email.current')}</dt>
        <dd>{user?.email}</dd>
      </dl>

      {sentTo ? (
        <p className="status status--ok">{t('email.sent', { email: sentTo })}</p>
      ) : (
        pending && <p className="status status--pending">{t('email.pending', { email: pending })}</p>
      )}

      {isDemo && <DemoLockNotice />}

      <fieldset className="plain-fieldset" disabled={isDemo}>
      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          {t('email.new')}
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        {error && <p className="status status--error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="button" disabled={sending || !email.trim()}>
            {sending ? t('email.sending') : t('email.submit')}
          </button>
        </div>
      </form>
      </fieldset>
    </div>
  )
}

export default EmailSection
