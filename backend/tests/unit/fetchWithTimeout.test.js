import { describe, it, expect, vi } from 'vitest'
import { createFetchWithTimeout, fetchWithTimeout } from '../../src/utils/fetchWithTimeout.js'

// fetch falso que só termina se for cancelado.
function hangingFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    (input, init) =>
      new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason))
      })
  )
}

describe('fetchWithTimeout', () => {
  it('cancela a chamada ao Supabase que passa do prazo', async () => {
    hangingFetch()
    // Prazo curto só no teste (o de verdade é SUPABASE_TIMEOUT_MS).
    const fetchFast = createFetchWithTimeout(20)

    await expect(fetchFast('https://projetoteste.supabase.co/auth/v1/user')).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('repassa as opções e respeita um cancelamento de quem chamou', async () => {
    const fetchMock = hangingFetch()
    const controller = new AbortController()

    const promise = fetchWithTimeout('https://x', { method: 'POST', signal: controller.signal })
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
