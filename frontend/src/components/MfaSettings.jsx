import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useProfile } from '../hooks/useProfile.jsx'
import DemoLockNotice from './DemoLockNotice.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { translateAuthError } from '../utils/authErrors.js'
import { formatSecret, normalizeCode, qrCodeSrc } from '../utils/mfa.js'
import TotpCodeInput from './TotpCodeInput.jsx'
import Icon from './Icon.jsx'
import { Trans, useI18n } from '../i18n/index.jsx'

// Configurações > Verificação em duas etapas.
// Ativar: o Supabase gera um QR Code; a pessoa lê com o app autenticador e
// digita o primeiro código para provar que deu certo. Só então o app fica
// valendo (antes disso ele é "não confirmado" e não muda nada no login).
function MfaSettings() {
  const { listFactors, enrollTotp, verifyTotp, unenrollFactor } = useAuth()
  const toast = useToast()
  const { t } = useI18n()
  const { isDemo } = useProfile()
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [factor, setFactor] = useState(null) // app já confirmado
  const [enrollment, setEnrollment] = useState(null) // { id, qrCode, secret }
  const [code, setCode] = useState('')
  const [confirmingDisable, setConfirmingDisable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: listError } = await listFactors()
    if (listError) {
      setError(translateAuthError(listError))
      setStatus('error')
      return null
    }
    setFactor(data.totp[0] ?? null)
    setStatus('ready')
    return data
  }, [listFactors])

  useEffect(() => {
    load()
  }, [load])

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(translateAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const startEnrollment = () =>
    run(async () => {
      // Um cadastro que ficou pela metade (QR lido mas código nunca
      // confirmado) impede um novo com o mesmo nome: apaga antes.
      const data = await load()
      const leftovers = (data?.all ?? []).filter(
        (item) => item.factor_type === 'totp' && item.status === 'unverified'
      )
      for (const leftover of leftovers) {
        const { error: removeError } = await unenrollFactor(leftover.id)
        if (removeError) throw removeError
      }

      const { data: enrolled, error: enrollError } = await enrollTotp()
      if (enrollError) throw enrollError
      setCode('')
      setEnrollment({ id: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret })
    })

  const confirmEnrollment = (e) => {
    e.preventDefault()
    return run(async () => {
      const { error: verifyError } = await verifyTotp(enrollment.id, normalizeCode(code))
      if (verifyError) {
        setCode('')
        throw verifyError
      }
      setEnrollment(null)
      await load()
      toast(t('mfa.enabledToast'))
    })
  }

  const cancelEnrollment = () =>
    run(async () => {
      await unenrollFactor(enrollment.id)
      setEnrollment(null)
    })

  const disable = () =>
    run(async () => {
      const { error: removeError } = await unenrollFactor(factor.id)
      if (removeError) throw removeError
      setConfirmingDisable(false)
      await load()
      toast(t('mfa.disabledToast'))
    })

  return (
    <>
      <h2>{t('mfa.title')}</h2>
      <p>{t('mfa.intro')}</p>

      {status === 'loading' && <p className="status status--pending">{t('common.loading')}</p>}
      {error && <p className="status status--error">{error}</p>}

      {status === 'error' && (
        <button type="button" className="button button--ghost" onClick={() => run(load)} disabled={busy}>
          {t('common.retry')}
        </button>
      )}

      {status === 'ready' && factor && (
        <div className="mfa-box">
          <p className="status status--ok status--with-icon">
            <Icon name="shield" />
            <span>{t('mfa.enabled')}</span>
          </p>
          {confirmingDisable ? (
            <span className="row-actions">
              <span>{t('mfa.disableConfirm')}</span>
              <button
                type="button"
                className="action-button action-button--danger-solid"
                onClick={disable}
                disabled={busy}
              >
                {t('mfa.disableYes')}
              </button>
              <button
                type="button"
                className="action-button action-button--neutral"
                onClick={() => setConfirmingDisable(false)}
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="action-button action-button--danger"
              onClick={() => setConfirmingDisable(true)}
            >
              {t('mfa.disable')}
            </button>
          )}
        </div>
      )}

      {status === 'ready' && !factor && !enrollment && (
        <>
          {isDemo && <DemoLockNotice />}
          <button type="button" className="button" onClick={startEnrollment} disabled={busy || isDemo}>
            <Icon name="shield" size={16} /> {busy ? t('mfa.generating') : t('mfa.enable')}
          </button>
        </>
      )}

      {enrollment && (
        <form className="mfa-box mfa-enroll" onSubmit={confirmEnrollment}>
          <ol className="mfa-steps">
            <li>
              <Trans k="mfa.step1" plus={<strong>+</strong>} other={<strong>{t('mfa.step1Other')}</strong>} />
            </li>
            <li>{t('mfa.step2')}</li>
            <li>{t('mfa.step3')}</li>
          </ol>
          <img className="mfa-qr" src={qrCodeSrc(enrollment.qrCode)} alt={t('mfa.qrAlt')} />
          <p className="mfa-secret">
            {t('mfa.secret')}{' '}
            <code>{formatSecret(enrollment.secret)}</code>
          </p>
          <div className="auth-form mfa-code">
            <TotpCodeInput value={code} onChange={setCode} autoFocus />
          </div>
          <div className="form-actions">
            <button type="submit" className="button" disabled={busy || normalizeCode(code).length !== 6}>
              {busy ? t('mfa.confirming') : t('mfa.confirm')}
            </button>
            <button type="button" className="button button--ghost" onClick={cancelEnrollment} disabled={busy}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default MfaSettings
