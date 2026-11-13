import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { buildCsp, inlineScriptHashes } from '../../csp.js'

const base = { supabaseUrl: 'https://abc123.supabase.co/', apiUrl: 'https://api.exemplo.com/api' }
const directive = (csp, name) => csp.split('; ').find((part) => part.startsWith(`${name} `))

describe('Content-Security-Policy', () => {
  it('scripts só do próprio site; nada de inline sem hash, nem eval', () => {
    const csp = buildCsp(base)
    expect(directive(csp, 'script-src')).toBe("script-src 'self'")
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
  })

  it('conexões só com o Supabase e o backend (só a origem, sem caminho)', () => {
    expect(directive(buildCsp(base), 'connect-src')).toBe(
      "connect-src 'self' https://abc123.supabase.co https://api.exemplo.com"
    )
  })

  it('bloqueia plugins, iframes, <base> trocado e formulários para fora', () => {
    const csp = buildCsp(base)
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'frame-src')).toBe("frame-src 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")
  })

  it('QR Code do app autenticador (data:) e fotos de perfil (só do Supabase)', () => {
    expect(directive(buildCsp(base), 'img-src')).toBe("img-src 'self' data: https://abc123.supabase.co")
  })

  it('com CAPTCHA: libera só o Cloudflare Turnstile', () => {
    const csp = buildCsp({ ...base, captcha: true })
    expect(directive(csp, 'script-src')).toBe("script-src 'self' https://challenges.cloudflare.com")
    expect(directive(csp, 'frame-src')).toBe('frame-src https://challenges.cloudflare.com')
  })

  it('URL inválida no .env não vira lixo na política', () => {
    expect(directive(buildCsp({ supabaseUrl: '', apiUrl: 'não é url' }), 'connect-src')).toBe("connect-src 'self'")
  })

  it('o script inline do tema entra pelo hash exato do conteúdo', () => {
    const body = "\n  var tema = 'dark'\n"
    const html = `<head><script>${body}</script><script type="module" src="/src/main.jsx"></script></head>`
    const expected = `'sha256-${createHash('sha256').update(body).digest('base64')}'`
    expect(inlineScriptHashes(html)).toEqual([expected])
    expect(directive(buildCsp({ ...base, scriptHashes: [expected] }), 'script-src')).toBe(`script-src 'self' ${expected}`)
  })
})
