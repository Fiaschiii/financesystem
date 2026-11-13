import { useState } from 'react'
import { formatInputBRL, parseBRL } from '../utils/currency.js'
import { useI18n } from '../i18n/index.jsx'

// Formulário de caixinha, usado para criar e para editar.
// Ao criar, escolhe a categoria; ao editar (initialValues presente), só o
// limite pode mudar — a categoria e o mês identificam a caixinha.
function BudgetForm({ categories, initialValues, onSave, onCancel }) {
  const { t } = useI18n()
  const isEditing = Boolean(initialValues)
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? '')
  const [limit, setLimit] = useState(initialValues ? formatInputBRL(initialValues.limit_amount) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!isEditing && !categoryId) {
      setError(t('budget.errCategory'))
      return
    }

    const value = parseBRL(limit)
    if (Number.isNaN(value) || value < 0) {
      setError(t('budget.errLimit', { example: t('money.exampleLimit') }))
      return
    }

    const limitAmount = Math.round(value * 100) / 100

    setSaving(true)
    try {
      await onSave(isEditing ? { limit_amount: limitAmount } : { category_id: categoryId, limit_amount: limitAmount })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="budget-form" onSubmit={handleSubmit}>
      {!isEditing && (
        <label>
          {t('budget.category')}
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} autoFocus>
            <option value="">{t('budget.selectCategory')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        {t('budget.limit')}
        <span className="salary-input">
          <span aria-hidden="true">R$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder={t('money.exampleLimit')}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            autoFocus={isEditing}
          />
        </span>
      </label>

      {error && <p className="status status--error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="button" disabled={saving}>
          {saving ? t('common.saving') : t('budget.submit')}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

export default BudgetForm
