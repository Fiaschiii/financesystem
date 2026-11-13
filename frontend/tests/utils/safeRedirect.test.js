import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from '../../src/utils/safeRedirect.js'

describe('safeRedirectPath', () => {
  it.each(['/', '/history', '/settings', '/?mes=2026-10', '/profile?aba=seguranca'])('aceita caminho interno %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path)
  })

  it.each([
    '//site-malicioso.com',
    '/\\site-malicioso.com',
    '/\\/site-malicioso.com',
    '\\\\site-malicioso.com',
    'https://site-malicioso.com',
    'javascript:alert(1)',
    '/\t/site-malicioso.com',
    '/\n/site-malicioso.com',
    '',
    undefined,
    null,
    { pathname: '/history' },
  ])('recusa %j e volta para o Resumo', (path) => {
    expect(safeRedirectPath(path)).toBe('/')
  })
})
