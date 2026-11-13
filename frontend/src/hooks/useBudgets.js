import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../services/api.js'

// Caixinhas (orçamento por categoria) de um mês. Só carrega quando mês e ano
// já são conhecidos. Depois de criar, editar ou excluir, busca a lista de novo
// (em silêncio): assim o valor gasto de cada categoria vem sempre do servidor.
export function useBudgets(month, year) {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Só a resposta da última requisição vale (ver useFinance).
  const latestRequest = useRef(0)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!month || !year) return
      const requestId = ++latestRequest.current
      if (!silent) {
        setLoading(true)
        setError('')
      }
      try {
        const data = await apiFetch(`/api/budgets?month=${month}&year=${year}`)
        if (requestId !== latestRequest.current) return
        setBudgets(data.budgets)
        setError('')
      } catch (err) {
        if (requestId !== latestRequest.current) return
        setError(err.message)
      } finally {
        if (requestId === latestRequest.current) setLoading(false)
      }
    },
    [month, year]
  )

  useEffect(() => {
    load()
  }, [load])

  // As três funções lançam o erro para quem chamou mostrar a mensagem.
  const addBudget = useCallback(
    async (values) => {
      await apiFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ ...values, month, year }),
      })
      await load({ silent: true })
    },
    [load, month, year]
  )

  const updateBudget = useCallback(
    async (id, values) => {
      await apiFetch(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(values) })
      await load({ silent: true })
    },
    [load]
  )

  const deleteBudget = useCallback(
    async (id) => {
      await apiFetch(`/api/budgets/${id}`, { method: 'DELETE' })
      await load({ silent: true })
    },
    [load]
  )

  return { budgets, loading, error, addBudget, updateBudget, deleteBudget, reload: load }
}
