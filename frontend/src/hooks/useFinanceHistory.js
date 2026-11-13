import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/api.js'

// Resumo de todos os meses já cadastrados (salário, gastos e saldo), para a
// tela de Histórico.
export function useFinanceHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const data = await apiFetch('/api/finance')
      setHistory(data.history)
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

  // Reaproveita o PUT /api/finance/:id (o mesmo que o Dashboard usa pro mês
  // atual): não há restrição de mês, então funciona pra qualquer um do histórico.
  const updateSalary = useCallback(
    async (id, salary) => {
      await apiFetch(`/api/finance/${id}`, { method: 'PUT', body: JSON.stringify({ salary }) })
      await load({ silent: true })
    },
    [load]
  )

  return { history, loading, error, updateSalary, reload: load }
}
