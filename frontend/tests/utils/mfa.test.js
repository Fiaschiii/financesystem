import { describe, it, expect } from 'vitest'
import {
  decodeJwtPayload,
  getAssuranceLevel,
  isMfaPending,
  qrCodeSrc,
  formatSecret,
  normalizeCode,
} from '../../src/utils/mfa.js'

function jwt(claims) {
  // Como num JWT de verdade: JSON em UTF-8, depois base64url sem "=".
  const part = (value) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    return btoa(String.fromCharCode(...bytes)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  }
  return `${part({ alg: 'HS256' })}.${part(claims)}.assinatura`
}

const verified = [{ status: 'verified' }]

describe('decodeJwtPayload', () => {
  it('lê o conteúdo, inclusive acentos', () => {
    expect(decodeJwtPayload(jwt({ aal: 'aal2', nome: 'João' }))).toEqual({ aal: 'aal2', nome: 'João' })
  })

  it('token quebrado: null', () => {
    expect(decodeJwtPayload('sem-pontos')).toBeNull()
    expect(decodeJwtPayload(undefined)).toBeNull()
  })
})

describe('nível da sessão', () => {
  it('sem sessão: nada pendente', () => {
    expect(getAssuranceLevel(null)).toEqual({ currentLevel: null, nextLevel: null })
    expect(isMfaPending(null)).toBe(false)
  })

  it('sem app: aal1 basta', () => {
    const session = { access_token: jwt({ aal: 'aal1' }), user: { factors: [] } }
    expect(getAssuranceLevel(session)).toEqual({ currentLevel: 'aal1', nextLevel: 'aal1' })
    expect(isMfaPending(session)).toBe(false)
  })

  it('app só lido no QR Code (não confirmado): não pede código', () => {
    const session = { access_token: jwt({ aal: 'aal1' }), user: { factors: [{ status: 'unverified' }] } }
    expect(isMfaPending(session)).toBe(false)
  })

  it('com app e só a senha: pendente', () => {
    const session = { access_token: jwt({ aal: 'aal1' }), user: { factors: verified } }
    expect(getAssuranceLevel(session)).toEqual({ currentLevel: 'aal1', nextLevel: 'aal2' })
    expect(isMfaPending(session)).toBe(true)
  })

  it('com app e código digitado: liberado', () => {
    const session = { access_token: jwt({ aal: 'aal2' }), user: { factors: verified } }
    expect(isMfaPending(session)).toBe(false)
  })

  it('token ilegível com app ativado: pendente (na dúvida, pede o código)', () => {
    expect(isMfaPending({ access_token: 'lixo', user: { factors: verified } })).toBe(true)
  })
})

describe('apresentação', () => {
  it('QR Code: aceita data URI ou SVG puro', () => {
    expect(qrCodeSrc('data:image/svg+xml;utf-8,<svg/>')).toBe('data:image/svg+xml;utf-8,<svg/>')
    expect(qrCodeSrc('<svg></svg>')).toBe('data:image/svg+xml;utf-8,%3Csvg%3E%3C%2Fsvg%3E')
    expect(qrCodeSrc(undefined)).toBe('')
  })

  it('chave em grupos de 4', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
    expect(formatSecret('ABCDEF')).toBe('ABCD EF')
  })

  it('código: só dígitos, no máximo 6', () => {
    expect(normalizeCode('123 456')).toBe('123456')
    expect(normalizeCode('12-34-5678')).toBe('123456')
    expect(normalizeCode('abc')).toBe('')
  })
})
