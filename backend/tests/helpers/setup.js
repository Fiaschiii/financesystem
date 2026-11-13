import { vi } from 'vitest'
import {
  USER, VALID_TOKEN, CRASH_TOKEN, MFA_USER, MFA_AAL1_TOKEN, MFA_AAL2_TOKEN, SESSION_TOKEN,
} from './constants.js'

// Substitui o cliente do Supabase em TODOS os testes. Só a validação do login
// (auth.getUser) é simulada aqui: as consultas às tabelas ficam nos serviços,
// que os testes de API simulam com vi.mock e os testes de unidade testam com
// tests/helpers/fakeSupabase.js.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async (token) => {
        if (token === CRASH_TOKEN) throw new Error('Supabase fora do ar')
        if (token === VALID_TOKEN || token === SESSION_TOKEN) return { data: { user: USER }, error: null }
        if (token === MFA_AAL1_TOKEN || token === MFA_AAL2_TOKEN) {
          return { data: { user: MFA_USER }, error: null }
        }
        return { data: { user: null }, error: { message: 'invalid JWT' } }
      }),
    },
    from: vi.fn(() => {
      throw new Error('Consulta ao banco não simulada neste teste')
    }),
  })),
}))
