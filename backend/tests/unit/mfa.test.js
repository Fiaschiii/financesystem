import { describe, it, expect } from 'vitest'
import { getTokenAal, hasVerifiedFactor, isMfaSatisfied } from '../../src/utils/mfa.js'
import { fakeJwt } from '../helpers/constants.js'

const withApp = { factors: [{ status: 'verified' }] }
const halfway = { factors: [{ status: 'unverified' }] }
const noApp = { factors: [] }

describe('getTokenAal', () => {
  it('lê o nível do token', () => {
    expect(getTokenAal(fakeJwt({ aal: 'aal1' }))).toBe('aal1')
    expect(getTokenAal(fakeJwt({ aal: 'aal2' }))).toBe('aal2')
  })

  it.each([
    ['sem o campo', fakeJwt({ sub: 'x' })],
    ['campo que não é texto', fakeJwt({ aal: ['aal2'] })],
    ['token sem pontos', 'token-valido'],
    ['conteúdo que não é JSON', 'a.bm9wZQ.c'],
    ['vazio', ''],
  ])('%s: null', (_, token) => {
    expect(getTokenAal(token)).toBeNull()
  })
})

describe('hasVerifiedFactor', () => {
  it('só conta app confirmado', () => {
    expect(hasVerifiedFactor(withApp)).toBe(true)
    expect(hasVerifiedFactor(halfway)).toBe(false)
    expect(hasVerifiedFactor(noApp)).toBe(false)
    expect(hasVerifiedFactor({})).toBe(false)
    expect(hasVerifiedFactor(null)).toBe(false)
  })
})

describe('isMfaSatisfied', () => {
  const aal1 = fakeJwt({ aal: 'aal1' })
  const aal2 = fakeJwt({ aal: 'aal2' })

  it('sem app: qualquer nível serve', () => {
    expect(isMfaSatisfied(noApp, aal1)).toBe(true)
    expect(isMfaSatisfied(halfway, aal1)).toBe(true)
  })

  it('com app: só aal2', () => {
    expect(isMfaSatisfied(withApp, aal2)).toBe(true)
    expect(isMfaSatisfied(withApp, aal1)).toBe(false)
    expect(isMfaSatisfied(withApp, 'token-sem-formato')).toBe(false)
  })
})
