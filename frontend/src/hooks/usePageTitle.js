import { useEffect } from 'react'
import { useI18n } from '../i18n/index.jsx'

// Título da aba do navegador: "Histórico · Controle Financeiro".
// Recebe a CHAVE do texto (ex.: 'history.pageTitle'), para acompanhar o idioma.
export function usePageTitle(titleKey) {
  const { t } = useI18n()
  const title = titleKey ? t(titleKey) : ''
  const appName = t('app.name')
  useEffect(() => {
    document.title = title ? `${title} · ${appName}` : appName
  }, [title, appName])
}
