import { normalizeCode } from '../utils/mfa.js'
import { useI18n } from '../i18n/index.jsx'

// Campo do código de 6 dígitos do app autenticador. No celular abre o teclado
// numérico, e o navegador pode sugerir o código (autocomplete one-time-code).
function TotpCodeInput({ value, onChange, autoFocus = false }) {
  const { t } = useI18n()
  return (
    <label>
      {t('mfa.codeLabel')}
      <input
        className="totp-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        placeholder="000000"
        value={value}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
        autoFocus={autoFocus}
        required
      />
    </label>
  )
}

export default TotpCodeInput
