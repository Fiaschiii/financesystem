import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../../services/api.js'
import { useToast } from '../../hooks/useToast.jsx'
import { useProfile } from '../../hooks/useProfile.jsx'
import DemoLockNotice from '../DemoLockNotice.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { formatDateTime } from '../../utils/date.js'
import { describeUserAgent, isMobileUserAgent } from '../../utils/userAgent.js'
import { SkeletonRows } from '../Skeleton.jsx'

// Minha conta > Sessões ativas. Lista e encerra as sessões (aparelhos) da
// própria conta. O backend descobre de quem são pelo token; aqui só vai o id
// da SESSÃO a encerrar, e o banco recusa se ela não for de quem pediu.
function SessionsSection() {
  const { t } = useI18n()
  const toast = useToast()
  const { isDemo } = useProfile()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null) // id ou 'others'
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await apiFetch('/api/profile/sessions')
      setSessions(data.sessions)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function run(action) {
    setError('')
    setBusy(true)
    try {
      await action()
      setConfirmingId(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const revoke = (id) =>
    run(async () => {
      await apiFetch(`/api/profile/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
      toast(t('sessions.revoked'))
    })

  const revokeOthers = () =>
    run(async () => {
      const { revoked } = await apiFetch('/api/profile/sessions', { method: 'DELETE' })
      toast(t('sessions.revokedOthers', { count: revoked }))
    })

  function deviceLabel(session) {
    const { browser, os } = describeUserAgent(session.user_agent)
    if (browser && os) return t('sessions.browserOnOs', { browser, os })
    return browser || os || t('sessions.unknownDevice')
  }

  const others = sessions.filter((session) => !session.is_current)

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>{t('sessions.title')}</h2>
        {others.length > 0 &&
          (confirmingId === 'others' ? (
            <span className="row-actions">
              <span>{t('sessions.revokeOthersConfirm')}</span>
              <button type="button" className="action-button action-button--danger-solid" onClick={revokeOthers} disabled={busy}>
                {t('sessions.revokeYes')}
              </button>
              <button type="button" className="action-button action-button--neutral" onClick={() => setConfirmingId(null)} disabled={busy}>
                {t('common.cancel')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="action-button action-button--danger"
              onClick={() => setConfirmingId('others')}
              disabled={isDemo}
            >
              {t('sessions.revokeOthers')}
            </button>
          ))}
      </div>
      <p>{t('sessions.intro')}</p>
      {isDemo && others.length > 0 && <DemoLockNotice />}

      {loading && <SkeletonRows count={2} />}
      {error && (
        <div className="dashboard-panel">
          <p className="status status--error">{error}</p>
          <button type="button" className="button button--ghost" onClick={load} disabled={busy}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <ul className="session-list">
          {sessions.map((session) => {
            const label = deviceLabel(session)
            return (
              <li key={session.id} className={`session-list__item${session.is_current ? ' session-list__item--current' : ''}`}>
                <span className="session-list__icon" aria-hidden="true">
                  {isMobileUserAgent(session.user_agent) ? '📱' : '💻'}
                </span>
                <div className="session-list__info">
                  <strong>
                    {label}
                    {session.is_current && <span className="badge">{t('sessions.current')}</span>}
                  </strong>
                  <span className="session-list__meta">
                    {[
                      t('sessions.lastActive', { date: formatDateTime(session.last_active_at) }),
                      session.ip && t('sessions.ip', { ip: session.ip }),
                      session.aal === 'aal2' && t('sessions.withMfa'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>

                {!session.is_current &&
                  (confirmingId === session.id ? (
                    <span className="row-actions">
                      <span>{t('sessions.revokeConfirm')}</span>
                      <button
                        type="button"
                        className="action-button action-button--danger-solid"
                        onClick={() => revoke(session.id)}
                        disabled={busy}
                      >
                        {t('sessions.revokeYes')}
                      </button>
                      <button
                        type="button"
                        className="action-button action-button--neutral"
                        onClick={() => setConfirmingId(null)}
                        disabled={busy}
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="action-button action-button--danger"
                      aria-label={t('sessions.revokeLabel', { device: label })}
                      onClick={() => setConfirmingId(session.id)}
                      disabled={isDemo}
                    >
                      {t('sessions.revoke')}
                    </button>
                  ))}
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !error && others.length === 0 && <p className="empty-state">{t('sessions.onlyThis')}</p>}
    </div>
  )
}

export default SessionsSection
