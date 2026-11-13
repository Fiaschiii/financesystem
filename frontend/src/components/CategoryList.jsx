import { useState } from 'react'
import { useToast } from '../hooks/useToast.jsx'
import CategoryForm from './CategoryForm.jsx'
import { useI18n } from '../i18n/index.jsx'

// Lista de categorias. Editar abre o formulário no lugar da linha;
// excluir pede uma confirmação na própria linha (sem janela do navegador).
function CategoryList({ categories, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const toast = useToast()
  const { t } = useI18n()

  async function handleUpdate(id, values) {
    await onUpdate(id, values)
    setEditingId(null)
    toast(t('toast.categoryUpdated'))
  }

  async function handleDelete(id) {
    setActionError('')
    setBusyId(id)
    try {
      await onDelete(id)
      setConfirmingId(null)
      toast(t('toast.categoryDeleted'))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (categories.length === 0) {
    return <p className="empty-state">{t('category.empty')}</p>
  }

  return (
    <>
      {actionError && <p className="status status--error">{actionError}</p>}

      <ul className="category-list">
        {categories.map((category) =>
          editingId === category.id ? (
            <li key={category.id} className="category-list__item">
              <CategoryForm
                initialValues={category}
                onSave={(values) => handleUpdate(category.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={category.id} className="category-list__item">
              <div className="category-list__info">
                <strong>{category.name}</strong>
                {category.description && (
                  <span className="category-list__description">{category.description}</span>
                )}
              </div>

              {confirmingId === category.id ? (
                <span className="row-actions">
                  <span>{t('common.deleteConfirm')}</span>
                  <button
                    type="button"
                    className="action-button action-button--danger-solid"
                    onClick={() => handleDelete(category.id)}
                    disabled={busyId === category.id}
                  >
                    {t('common.yesDelete')}
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--neutral"
                    onClick={() => setConfirmingId(null)}
                    disabled={busyId === category.id}
                  >
                    {t('common.cancel')}
                  </button>
                </span>
              ) : (
                <span className="row-actions">
                  <button
                    type="button"
                    className="action-button"
                    aria-label={t('category.editLabel', { name: category.name })}
                    onClick={() => {
                      setConfirmingId(null)
                      setEditingId(category.id)
                    }}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--danger"
                    aria-label={t('category.deleteLabel', { name: category.name })}
                    onClick={() => {
                      setEditingId(null)
                      setConfirmingId(category.id)
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </span>
              )}
            </li>
          )
        )}
      </ul>
    </>
  )
}

export default CategoryList
