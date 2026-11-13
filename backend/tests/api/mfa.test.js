import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import * as financeService from '../../src/services/financeService.js'
import { MFA_USER, MFA_AAL1_TOKEN, MFA_AAL2_TOKEN, AUTH } from '../helpers/constants.js'

vi.mock('../../src/services/financeService.js')

const bearer = (token) => ({ Authorization: `Bearer ${token}` })

describe('verificação em duas etapas', () => {
  it('com app ativado e só a senha (aal1): 403 mfa_required', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer(MFA_AAL1_TOKEN))
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('mfa_required')
  })

  it('aal1 não chega nem a consultar os dados', async () => {
    const res = await request(app).get('/api/finance/2026/10').set(bearer(MFA_AAL1_TOKEN))
    expect(res.status).toBe(403)
    expect(financeService.getFinanceByMonth).not.toHaveBeenCalled()
  })

  it('com app ativado e o código digitado (aal2): passa', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer(MFA_AAL2_TOKEN))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: MFA_USER.id, email: MFA_USER.email })
  })

  it('sem app ativado: continua entrando só com a senha', async () => {
    const res = await request(app).get('/api/auth/me').set(AUTH)
    expect(res.status).toBe(200)
  })
})
