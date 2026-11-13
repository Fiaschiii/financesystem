import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'

// Formulário de categoria, usado para criar e para editar.
function CategoryForm({ initialValues, onSave, onCancel }) {
  const { t } = useI18n()
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('category.errName'))
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="category-form" onSubmit={handleSubmit}>
      <label>
        {t('category.name')}
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          autoFocus
        />
      </label>

      <label>
        {t('category.description')}
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={200}
        />
      </label>

      {error && <p className="status status--error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="button" disabled={saving}>
          {saving ? t('common.saving') : t('category.submit')}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

export default CategoryForm
