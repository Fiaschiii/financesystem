import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useProfile } from '../hooks/useProfile.jsx'
import { LANGUAGES, useI18n } from '../i18n/index.jsx'
import { GearIcon, GraphIcon, HistoryIcon, SignInIcon, SignOutIcon } from '@primer/octicons-react'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'

function navClass({ isActive }) {
  return isActive ? 'active' : undefined
}

// Cabeçalho. Em telas pequenas, os links ficam atrás do botão "Menu".
function Header() {
  const { user, mfaPending, signOut } = useAuth()
  const { profile } = useProfile()
  const { t, language, setLanguage } = useI18n()
  // Enquanto falta o código do app, a pessoa ainda não entrou de verdade:
  // nada de menu, só o botão de sair.
  const signedIn = Boolean(user) && !mfaPending
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Fecha o menu ao trocar de página.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // Fecha o menu com Esc.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  // Antes de entrar, o idioma troca aqui (depois, em Minha conta > Preferências).
  const otherLanguage = LANGUAGES.find((item) => item.value !== language) ?? LANGUAGES[0]
  const displayName = profile?.full_name || user?.email

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <span className="app-header__logo">
          <Icon name="logo" size={18} />
        </span>
        {t('app.name')}
      </Link>

      {signedIn && (
        <button
          type="button"
          className="icon-button app-header__menu-button"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
      )}

      <nav id="main-nav" className={`app-header__nav${menuOpen ? ' app-header__nav--open' : ''}`}>
        {signedIn ? (
          <>
            <NavLink to="/" end className={navClass}><GraphIcon size={16} className="nav-icon nav-icon--summary" /> {t('nav.summary')}</NavLink>
            <NavLink to="/history" className={navClass}><HistoryIcon size={16} className="nav-icon nav-icon--history" /> {t('nav.history')}</NavLink>
            <NavLink to="/settings" className={navClass}><GearIcon size={16} className="nav-icon nav-icon--settings" /> {t('nav.settings')}</NavLink>
            <span className="app-header__account">
              <NavLink
                to="/profile"
                className={({ isActive }) => `app-header__profile${isActive ? ' active' : ''}`}
                // O nome/e-mail continua no title: passando o mouse, dá para ver com qual conta entrou.
                title={`${t('nav.account')} (${displayName})`}
              >
                <Avatar url={profile?.avatar_url} name={displayName} size={28} />
                <span className="app-header__user">{t('nav.myProfile')}</span>
              </NavLink>
              <button type="button" className="app-header__logout" onClick={handleLogout}>
                <SignOutIcon size={16} className="nav-icon nav-icon--signout" /> {t('nav.signOut')}
              </button>
            </span>
          </>
        ) : user ? (
          <button type="button" className="app-header__logout" onClick={handleLogout}>
            {t('nav.signOut')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="app-header__language"
              onClick={() => setLanguage(otherLanguage.value)}
              aria-label={t('nav.language', { language: otherLanguage.label })}
              lang={otherLanguage.value}
            >
              {otherLanguage.short}
            </button>
            <NavLink to="/login" className={navClass}><SignInIcon size={16} /> {t('nav.signIn')}</NavLink>
          </>
        )}
      </nav>
    </header>
  )
}

export default Header
