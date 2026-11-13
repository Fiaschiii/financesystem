import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
vi.mock('../../src/services/supabase.js', () => ({
  supabase: { auth: { getSession: (...args) => getSession(...args) } },
}))

const { apiFetch, formatWait } = await import('../../src/services/api.js')

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('sem corpo')
      return body
    },
  }
}

beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } })
})

describe('apiFetch', () => {
  it('envia o token da sessão e devolve o JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { ok: true }))

    expect(await apiFetch('/api/finance', { method: 'POST', body: '{}' })).toEqual({ ok: true })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/finance$/)
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer abc')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('sem sessão, não manda Authorization', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, {}))
    await apiFetch('/api/health')
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
  })

  it('erro da API vira Error com a mensagem e o status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(400, { error: 'Categoria inválida.' }))
    await expect(apiFetch('/api/expenses')).rejects.toMatchObject({ message: 'Categoria inválida.', status: 400 })
  })

  it('inclui o detalhe técnico quando o backend manda', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(500, { error: 'Erro interno do servidor.', detail: 'tabela não existe' })
    )
    await expect(apiFetch('/x')).rejects.toThrow('Erro interno do servidor. (tabela não existe)')
  })

  it('resposta de erro sem JSON usa o código HTTP', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(502))
    await expect(apiFetch('/x')).rejects.toMatchObject({ message: 'Erro 502', status: 502 })
  })

  it('204 sem corpo devolve null', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204))
    expect(await apiFetch('/api/expenses/1', { method: 'DELETE' })).toBeNull()
  })

  it('backend desligado: mensagem explicando o que fazer', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('/x')).rejects.toThrow(/Confira se ele está rodando/)
  })
})

describe('limite de requisições (429)', () => {
  it('diz quanto tempo esperar e guarda o retryAfter no erro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(429, { error: 'Muitas alterações em pouco tempo.', code: 'rate_limited', retryAfter: 42 })
    )
    await expect(apiFetch('/api/expenses', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      message: 'Muitas alterações em pouco tempo. (liberado em 42 s)',
      status: 429,
      code: 'rate_limited',
      retryAfter: 42,
    })
  })

  it('formata segundos e minutos', () => {
    expect(formatWait(1)).toBe('1 s')
    expect(formatWait(59)).toBe('59 s')
    expect(formatWait(60)).toBe('1 min')
    expect(formatWait(61)).toBe('2 min')
  })
})

describe('leituras iguais ao mesmo tempo', () => {
  // fetch que só responde quando o teste mandar.
  function deferredFetch() {
    const pending = []
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise((resolve) => pending.push(resolve))
    )
    const flush = async (body) => {
      // authHeaders é assíncrono: espera o fetch ser chamado.
      await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0))
      pending.splice(0).forEach((resolve) => resolve(jsonResponse(200, body)))
    }
    return { fetchMock, flush }
  }

  it('o mesmo GET a caminho não sai de novo', async () => {
    const { fetchMock, flush } = deferredFetch()

    const a = apiFetch('/api/categories')
    const b = apiFetch('/api/categories')
    await flush({ categories: [] })

    expect(await a).toEqual({ categories: [] })
    expect(await b).toEqual({ categories: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('endereços diferentes saem separados; depois da resposta, o próximo GET sai de novo', async () => {
    const { fetchMock, flush } = deferredFetch()

    const a = apiFetch('/api/expenses?month=10&year=2026')
    const b = apiFetch('/api/expenses?month=11&year=2026')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await flush({})
    await Promise.all([a, b])

    const c = apiFetch('/api/expenses?month=10&year=2026')
    await flush({})
    await c
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('depois de uma gravação, o GET seguinte não reaproveita a leitura antiga', async () => {
    const { fetchMock, flush } = deferredFetch()

    const old = apiFetch('/api/categories')
    const save = apiFetch('/api/categories', { method: 'POST', body: '{}' })
    const fresh = apiFetch('/api/categories')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    await flush({})
    await Promise.all([old, save, fresh])
  })

  it('gravações nunca são agrupadas', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(201, {}))
    await Promise.all([
      apiFetch('/api/expenses', { method: 'POST', body: '{}' }),
      apiFetch('/api/expenses', { method: 'POST', body: '{}' }),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('um erro não fica guardado: o GET seguinte tenta de novo', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(500, { error: 'falhou' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    await expect(apiFetch('/api/finance')).rejects.toThrow('falhou')
    expect(await apiFetch('/api/finance')).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
