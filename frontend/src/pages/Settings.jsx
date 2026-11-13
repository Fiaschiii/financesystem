import { useState } from 'react'
import { useCategories } from '../hooks/useCategories.js'
import { useToast } from '../hooks/useToast.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useRouteReady } from '../hooks/useRouteLoading.jsx'
import { useI18n } from '../i18n/index.jsx'
import CategoryForm from '../components/CategoryForm.jsx'
import CategoryList from '../components/CategoryList.jsx'
import DashboardPanelsSettings from '../components/DashboardPanelsSettings.jsx'
import Icon from '../components/Icon.jsx'
import { SkeletonRows, LoadingLabel } from '../components/Skeleton.jsx'

// Configurações de como o sistema aparece: os painéis do Resumo (ordem e
// ícone) e as categorias. O que é da CONTA (senha, verificação em duas
// etapas, sessões, tema, idioma) fica em Minha conta.
function Settings() {
  usePageTitle('settings.title')
  const { t } = useI18n()
  const toast = useToast()
  const { categories, loading, error, addCategory, updateCategory, deleteCategory, reload } =
    useCategories()
  const [addingCategory, setAddingCategory] = useState(false)
  useRouteReady(!loading)

  async function handleAddCategory(values) {
    await addCategory(values)
    setAddingCategory(false)
    toast(t('toast.categoryCreated'))
  }

  return (
    <section className="page">
      <h1>{t('settings.title')}</h1>

      <DashboardPanelsSettings />

      <div className="settings-section">
        <div className="section-header">
          <h2>{t('settings.categories')}</h2>
          {!loading && !error && !addingCategory && (
            <button type="button" className="button" onClick={() => setAddingCategory(true)}>
              <Icon name="plus" size={16} /> {t('settings.newCategory')}
            </button>
          )}
        </div>
        <p>{t('settings.categoriesIntro')}</p>

        {loading && (
          <>
            <LoadingLabel />
            <SkeletonRows count={5} />
          </>
        )}

        {error && (
          <div className="dashboard-panel">
            <p className="status status--error">{error}</p>
            <button type="button" className="button button--ghost" onClick={reload}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {addingCategory && (
              <CategoryForm onSave={handleAddCategory} onCancel={() => setAddingCategory(false)} />
            )}
            <CategoryList categories={categories} onUpdate={updateCategory} onDelete={deleteCategory} />
          </>
        )}
      </div>

    </section>
  )
}

export default Settings
