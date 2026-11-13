import { describe, it, expect } from 'vitest'
import { formatPhone, looksLikePhone } from '../../src/utils/phone.js'
import { describeUserAgent, isMobileUserAgent } from '../../src/utils/userAgent.js'
import { initialsOf, prepareAvatar, AvatarError } from '../../src/utils/image.js'

describe('telefone', () => {
  it.each([
    ['+5511987654321', '(11) 98765-4321'],
    ['+551134567890', '(11) 3456-7890'],
    ['+14155552671', '+14155552671'],
    [null, ''],
  ])('formatPhone(%j) -> %j', (input, expected) => {
    expect(formatPhone(input)).toBe(expected)
  })

  it.each(['', '(11) 98765-4321', '+55 11 98765-4321', '+1 415 555 2671'])('aceita %j', (value) => {
    expect(looksLikePhone(value)).toBe(true)
  })

  it.each(['123', 'abc', '11 9876', '<b>11987654321</b>'])('recusa %j', (value) => {
    expect(looksLikePhone(value)).toBe(false)
  })
})

describe('aparelho da sessão', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0', 'Edge', 'Windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 'Safari', 'macOS'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36', 'Chrome', 'Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/131.0 Mobile/15E148 Safari/604.1', 'Chrome', 'iOS'],
    ['curl/8.5.0', null, null],
    [null, null, null],
  ])('%s', (ua, browser, os) => {
    expect(describeUserAgent(ua)).toEqual({ browser, os })
  })

  it('celular x computador', () => {
    expect(isMobileUserAgent('Mozilla/5.0 (iPhone; ...) Mobile/15E148')).toBe(true)
    expect(isMobileUserAgent('Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0')).toBe(false)
  })
})

describe('foto de perfil', () => {
  it.each([
    ['Ana Maria Souza', 'AS'],
    ['ana', 'A'],
    ['ana@exemplo.com', 'A'],
    ['  ', '?'],
    [null, '?'],
  ])('initialsOf(%j) -> %s', (input, expected) => {
    expect(initialsOf(input)).toBe(expected)
  })

  it('recusa tipo fora da lista antes de qualquer coisa', async () => {
    await expect(prepareAvatar(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).rejects.toBeInstanceOf(AvatarError)
  })

  it('sem canvas (navegador antigo): envia o original, se couber em 2 MB', async () => {
    const small = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })
    expect(await prepareAvatar(small)).toBe(small)
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' })
    await expect(prepareAvatar(big)).rejects.toMatchObject({ messageKey: 'personal.photoTooLarge' })
  })
})
