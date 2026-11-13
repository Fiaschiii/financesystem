import Icon from './Icon.jsx'
import { useI18n } from '../i18n/index.jsx'

// Aviso das partes travadas na conta de demonstração (ver migração 0007):
// o visitante entende por que o botão está desligado, em vez de achar que
// o sistema quebrou.
function DemoLockNotice() {
  const { t } = useI18n()
  return (
    <p className="status status--pending status--with-icon">
      <Icon name="shield" />
      <span>{t('demo.locked')}</span>
    </p>
  )
}

export default DemoLockNotice
