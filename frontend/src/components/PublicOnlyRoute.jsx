import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../i18n/index.jsx'

function PublicOnlyRoute({ children }) {
  const { user, loading, mfaPending } = useAuth()
  const { t } = useI18n()

  if (loading) {
    // A tela de carregamento (AppLoader) já está cobrindo a página.
    return <span className="visually-hidden">{t('common.loading')}</span>
  }

  if (user) {
    return <Navigate to={mfaPending ? '/mfa' : '/'} replace />
  }

  return children
}

export default PublicOnlyRoute
