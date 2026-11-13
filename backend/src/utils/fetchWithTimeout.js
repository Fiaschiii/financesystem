// fetch com prazo: se o Supabase demorar demais para responder, a requisição
// é cancelada e vira erro (500), em vez de ficar pendurada. Sem isso, uma
// lentidão do Supabase faria as requisições se acumularem no backend até
// esgotar a memória ou as conexões.
export const SUPABASE_TIMEOUT_MS = 10_000

export function createFetchWithTimeout(timeoutMs) {
  return (input, init = {}) => {
    const timeout = AbortSignal.timeout(timeoutMs)
    // Respeita um cancelamento que já venha de quem chamou (AbortSignal.any só
    // existe a partir do Node 20; no 18, vale só o de quem chamou).
    const signal =
      init.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([init.signal, timeout])
        : init.signal || timeout
    return fetch(input, { ...init, signal })
  }
}

export const fetchWithTimeout = createFetchWithTimeout(SUPABASE_TIMEOUT_MS)
