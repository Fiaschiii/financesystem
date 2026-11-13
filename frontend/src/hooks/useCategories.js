import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/api.js'

// Categorias do usuário (para o seletor do formulário de gastos e para a tela
// de Configurações, onde também podem ser criadas, editadas e excluídas).
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const data = await apiFetch('/api/categories')
      setCategories(data.categories)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // As três funções lançam o erro para quem chamou mostrar a mensagem.
  const addCategory = useCallback(
    async (values) => {
      await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(values) })
      await load({ silent: true })
    },
    [load]
  )

  const updateCategory = useCallback(
    async (id, values) => {
      await apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(values) })
      await load({ silent: true })
    },
    [load]
  )

  const deleteCategory = useCallback(
    async (id) => {
      await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
      await load({ silent: true })
    },
    [load]
  )

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    reload: load,
  }
}
