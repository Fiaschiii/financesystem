import { useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PersonIcon, ShieldLockIcon, SlidersIcon } from '@primer/octicons-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useProfile } from '../hooks/useProfile.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useI18n } from '../i18n/index.jsx'
import PersonalDataSection from '../components/profile/PersonalDataSection.jsx'
import EmailSection from '../components/profile/EmailSection.jsx'
import PasswordSection from '../components/profile/PasswordSection.jsx'
import SessionsSection from '../components/profile/SessionsSection.jsx'
import PreferencesSection from '../components/profile/PreferencesSection.jsx'
import MfaSettings from '../components/MfaSettings.jsx'
import { SkeletonRows, LoadingLabel } from '../components/Skeleton.jsx'

// Minha conta (autogestão do perfil), em três abas:
// - Dados cadastrais: foto, nome, telefone e e-mail;
// - Segurança: senha, verificação em duas etapas e sessões ativas;
// - Preferências: idioma, tema e avisos.
// A aba fica na URL (?aba=seguranca): dá para recarregar e mandar o link.
export const TABS = [
  { id: 'dados', labelKey: 'profile.tabPersonal', Icon: PersonIcon },
  { id: 'seguranca', labelKey: 'profile.tabSecurity', Icon: ShieldLockIcon },
  { id: 'preferencias', labelKey: 'profile.tabPreferences', Icon: SlidersIcon },
]

function Profile() {
  usePageTitle('profile.title')
  const { t } = useI18n()
  const { user } = useAuth()
  const { profile, loading, error, reload } = useProfile()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabRefs = useRef([])

  const activeId = TABS.some((tab) => tab.id === searchParams.get('aba')) ? searchParams.get('aba') : TABS[0].id
  const activeIndex = TABS.findIndex((tab) => tab.id === activeId)
  useRouteReady(Boolean(profile) || Boolean(error))

  function selectTab(index) {
    setSearchParams(index === 0 ? {} : { aba: TABS[index].id }, { replace: true })
  }

  // Setas do teclado trocam de aba (padrão WAI-ARIA para abas).
  function handleKeyDown(event) {
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -activeIndex, End: TABS.length - 1 - activeIndex }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = (activeIndex + moves[event.key] + TABS.length) % TABS.length
    selectTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="page">
      <h1>{t('profile.title')}</h1>

      <div className="tabs" role="tablist" aria-label={t('profile.tabs')} onKeyDown={handleKeyDown}>
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => (tabRefs.current[index] = element)}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeId}
            aria-controls={`panel-${tab.id}`}
            tabIndex={tab.id === activeId ? 0 : -1}
            className={`tabs__tab${tab.id === activeId ? ' tabs__tab--active' : ''}`}
            onClick={() => selectTab(index)}
          >
            <tab.Icon size={16} className={`tabs__icon tabs__icon--${tab.id}`} /> {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${activeId}`} aria-labelledby={`tab-${activeId}`} className="tabs__panel">
        {/* A Segurança não depende do perfil: senha, MFA e sessões são do login. */}
        {activeId === 'seguranca' ? (
          <>
            <PasswordSection />
            <div className="settings-section">
              <MfaSettings />
            </div>
            <SessionsSection />
          </>
        ) : (
          <>
            {loading && !profile && (
              <>
                <LoadingLabel />
                <SkeletonRows count={4} />
              </>
            )}
            {error && !profile && (
              <div className="dashboard-panel">
                <p className="status status--error">{error}</p>
                <button type="button" className="button button--ghost" onClick={reload}>
                  {t('common.retry')}
                </button>
              </div>
            )}
            {profile && activeId === 'dados' && (
              <>
                {/* key: se o perfil mudar por fora (outra aba), o formulário recomeça com os dados novos. */}
                <PersonalDataSection key={`${profile.full_name}|${profile.phone}`} profile={profile} email={user?.email} />
                <EmailSection />
              </>
            )}
            {profile && activeId === 'preferencias' && <PreferencesSection profile={profile} />}
          </>
        )}
      </div>
    </section>
  )
}

export default Profile
