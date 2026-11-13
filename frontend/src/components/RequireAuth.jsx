import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useI18n } from '../i18n/index.jsx'

function RequireAuth({ children }) {
  const { user, loading, mfaPending } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  if (loading) {
    // A tela de carregamento (AppLoader) já está cobrindo a página.
    return <span className="visually-hidden">{t('common.loading')}</span>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Senha certa, mas falta o código do app autenticador.
  if (mfaPending) {
    return <Navigate to="/mfa" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
