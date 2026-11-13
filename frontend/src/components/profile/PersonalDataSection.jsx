import { useRef, useState } from 'react'
import { useProfile } from '../../hooks/useProfile.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { AVATAR_TYPES, AvatarError, prepareAvatar } from '../../utils/image.js'
import { formatPhone, looksLikePhone } from '../../utils/phone.js'
import Avatar from '../Avatar.jsx'
import DemoLockNotice from '../DemoLockNotice.jsx'

// Minha conta > Dados cadastrais: foto, nome e telefone.
// O e-mail tem seção própria (EmailSection), porque a troca passa por
// confirmação no Supabase.
function PersonalDataSection({ profile, email }) {
  const { t } = useI18n()
  const toast = useToast()
  const { updateProfile, uploadAvatar, removeAvatar, isDemo } = useProfile()
  const fileRef = useRef(null)

  const [name, setName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(formatPhone(profile.phone))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (name.trim().length > 100) return setError(t('personal.errName'))
    if (!looksLikePhone(phone)) return setError(t('personal.errPhone'))

    setSaving(true)
    try {
      // Só os campos do formulário. Nada de id: o backend usa o do login.
      const saved = await updateProfile({ full_name: name.trim(), phone: phone.trim() })
      setName(saved?.full_name ?? '')
      setPhone(formatPhone(saved?.phone))
      toast(t('personal.saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // deixa escolher o mesmo arquivo de novo
    if (!file) return
    setPhotoError('')
    setPhotoBusy(true)
    try {
      const image = await prepareAvatar(file)
      await uploadAvatar(image)
      toast(t('personal.photoSaved'))
    } catch (err) {
      setPhotoError(err instanceof AvatarError ? t(err.messageKey) : err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleRemovePhoto() {
    setPhotoError('')
    setPhotoBusy(true)
    try {
      await removeAvatar()
      toast(t('personal.photoRemoved'))
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  const hasPhoto = Boolean(profile.avatar_url)

  return (
    <div className="settings-section">
      <h2>{t('personal.title')}</h2>
      {isDemo && <DemoLockNotice />}

      <fieldset className="plain-fieldset" disabled={isDemo}>
      <div className="avatar-editor">
        <Avatar url={profile.avatar_url} name={profile.full_name || email} size={88} alt={t('avatar.alt')} />
        <div className="avatar-editor__actions">
          <span className="avatar-editor__label">{t('personal.photo')}</span>
          <div className="row-actions">
            <button type="button" className="button button--ghost" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
              {photoBusy ? t('personal.uploading') : hasPhoto ? t('personal.changePhoto') : t('personal.addPhoto')}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="action-button action-button--danger"
                onClick={handleRemovePhoto}
                disabled={photoBusy}
              >
                {t('personal.removePhoto')}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="visually-hidden"
            tabIndex={-1}
            aria-label={t('personal.photo')}
            onChange={handleFile}
          />
          <small className="field-hint">{t('personal.photoHint')}</small>
          {photoError && <p className="status status--error">{photoError}</p>}
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        <label>
          {t('personal.name')}
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          {t('personal.phone')}
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder={t('personal.phonePlaceholder')}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={25}
          />
        </label>

        {error && <p className="status status--error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saving ? t('common.saving') : t('personal.submit')}
          </button>
        </div>
      </form>
      </fieldset>
    </div>
  )
}

export default PersonalDataSection
