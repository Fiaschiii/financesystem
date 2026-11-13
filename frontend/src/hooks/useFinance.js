import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../services/api.js'

// Registro (salário) de um mês: carrega e permite salvar.
export function useFinance(month, year) {
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Trocando de mês rápido, uma resposta antiga pode chegar depois da nova:
  // só a da última requisição vale.
  const latestRequest = useRef(0)

  // { silent: true } atualiza os dados sem piscar "Carregando…" na tela.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++latestRequest.current
      if (!silent) {
        setLoading(true)
        setError('')
      }
      try {
        const data = await apiFetch(`/api/finance/${year}/${month}`)
        if (requestId !== latestRequest.current) return
        setFinance(data.finance)
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

  // Cria o salário do mês (se ainda não existe) ou atualiza o existente.
  // Se falhar, lança o erro para o formulário mostrar a mensagem.
  const saveSalary = useCallback(
    async (salary) => {
      const data = finance
        ? await apiFetch(`/api/finance/${finance.id}`, { method: 'PUT', body: JSON.stringify({ salary }) })
        : await apiFetch('/api/finance', { method: 'POST', body: JSON.stringify({ month, year, salary }) })
      setFinance(data.finance)
    },
    [finance, month, year]
  )

  return { finance, loading, error, saveSalary, reload: load }
}
