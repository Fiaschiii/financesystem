import { useState } from 'react'
import { useProfile } from '../../hooks/useProfile.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { LANGUAGES, translate, useI18n } from '../../i18n/index.jsx'
import { THEMES, setTheme } from '../../utils/theme.js'

const NOTIFICATIONS = [
  { field: 'notify_budget_alerts', labelKey: 'prefs.budget' },
  { field: 'notify_missing_salary', labelKey: 'prefs.salary' },
  { field: 'notify_mfa_reminder', labelKey: 'prefs.mfa' },
]

// Minha conta > Preferências: idioma, tema e avisos. Cada mudança é salva
// na hora (sem botão "Salvar") e já aparece na tela; se o servidor recusar,
// volta ao que era.
function PreferencesSection({ profile }) {
  const { t, language, setLanguage } = useI18n()
  const toast = useToast()
  const { updateProfile } = useProfile()
  const [saving, setSaving] = useState(null) // campo sendo salvo
  const [error, setError] = useState('')

  async function save(field, value, { apply, revert } = {}) {
    setError('')
    setSaving(field)
    apply?.()
    try {
      await updateProfile({ [field]: value })
      // No idioma novo, se foi ele que mudou.
      toast(translate('prefs.saved', {}, field === 'language' ? value : language))
    } catch (err) {
      revert?.()
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  const changeLanguage = (value) =>
    save('language', value, { apply: () => setLanguage(value), revert: () => setLanguage(profile.language) })

  const changeTheme = (value) =>
    save('theme', value, { apply: () => setTheme(value), revert: () => setTheme(profile.theme) })

  return (
    <div className="settings-section">
      <fieldset className="theme-options">
        <legend>
          <h2>{t('prefs.language')}</h2>
        </legend>
        {LANGUAGES.map((option) => (
          <label key={option.value} className="radio-option" lang={option.value}>
            <input
              type="radio"
              name="language"
              value={option.value}
              checked={language === option.value}
              onChange={() => changeLanguage(option.value)}
              disabled={saving !== null}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="theme-options">
        <legend>
          <h2>{t('prefs.theme')}</h2>
        </legend>
        {THEMES.map((option) => (
          <label key={option.value} className="radio-option">
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={profile.theme === option.value}
              onChange={() => changeTheme(option.value)}
              disabled={saving !== null}
            />
            {t(option.labelKey)}
          </label>
        ))}
      </fieldset>

      <fieldset className="theme-options">
        <legend>
          <h2>{t('prefs.notifications')}</h2>
        </legend>
        <p className="field-hint">{t('prefs.notificationsIntro')}</p>
        {NOTIFICATIONS.map((option) => (
          <label key={option.field} className="radio-option">
            <input
              type="checkbox"
              checked={profile[option.field]}
              onChange={(event) => save(option.field, event.target.checked)}
              disabled={saving !== null}
            />
            {t(option.labelKey)}
          </label>
        ))}
      </fieldset>

      {error && <p className="status status--error">{error}</p>}
    </div>
  )
}

export default PreferencesSection
