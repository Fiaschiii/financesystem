import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useProfile } from '../../hooks/useProfile.jsx'
import DemoLockNotice from '../DemoLockNotice.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { translateAuthError } from '../../utils/authErrors.js'

const MIN_LENGTH = 8

// Minha conta > Senha. Quem troca é o Supabase Auth, pela sessão atual.
// Com "Secure password change" ligado no painel e um login antigo, o
// Supabase pede para confirmar a identidade: envia um código por e-mail
// (reauthenticate) e a troca só passa com ele.
function PasswordSection() {
  const { t } = useI18n()
  const toast = useToast()
  const { user, updatePassword, reauthenticate } = useAuth()
  const { isDemo } = useProfile()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nonce, setNonce] = useState('')
  const [needsNonce, setNeedsNonce] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) return setError(t('password.short'))
    if (password !== confirm) return setError(t('password.mismatch'))

    setSaving(true)
    try {
      const { error: updateError } = await updatePassword(password, needsNonce ? nonce.trim() : undefined)

      if (updateError?.code === 'reauthentication_needed' || /reauthentication/i.test(updateError?.message ?? '')) {
        if (!needsNonce) {
          const { error: reauthError } = await reauthenticate()
          if (reauthError) return setError(translateAuthError(reauthError))
          setNeedsNonce(true)
          return
        }
      }
      if (updateError) return setError(translateAuthError(updateError))

      setPassword('')
      setConfirm('')
      setNonce('')
      setNeedsNonce(false)
      toast(t('password.saved'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-section">
      <h2>{t('password.title')}</h2>
      <p>{t('password.intro')}</p>
      {isDemo && <DemoLockNotice />}

      <fieldset className="plain-fieldset" disabled={isDemo}>
      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        {/* Ajuda o gerenciador de senhas a saber de qual conta é a senha nova. */}
        <input type="text" autoComplete="username" className="visually-hidden" tabIndex={-1} aria-hidden="true" readOnly value={user?.email ?? ''} />
        <label>
          {t('password.new')}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={MIN_LENGTH}
            required
          />
        </label>
        <label>
          {t('password.confirm')}
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={MIN_LENGTH}
            required
          />
        </label>

        {needsNonce && (
          <>
            <p className="status status--pending">{t('password.reauth')}</p>
            <label>
              {t('password.nonce')}
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={nonce}
                onChange={(event) => setNonce(event.target.value)}
                autoFocus
                required
              />
            </label>
          </>
        )}

        {error && <p className="status status--error">{error}</p>}

        <div className="form-actions">
          <button
            type="submit"
            className="button"
            disabled={saving || !password || !confirm || (needsNonce && !nonce.trim())}
          >
            {saving ? t('password.saving') : needsNonce ? t('password.confirmSubmit') : t('password.submit')}
          </button>
        </div>
      </form>
      </fieldset>
    </div>
  )
}

export default PasswordSection
