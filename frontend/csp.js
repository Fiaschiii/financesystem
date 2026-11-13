import { createHash } from 'node:crypto'

// Content-Security-Policy: a lista do que a página pode carregar e de onde.
// Se alguém conseguir injetar um <script> na página (XSS), o navegador se
// recusa a rodá-lo, porque ele não está nesta lista.
//
// Vai como <meta> no index.html, só no build de produção: o servidor de
// desenvolvimento do Vite precisa de scripts inline (recarga automática)
// que a política bloquearia.

const TURNSTILE = 'https://challenges.cloudflare.com'

// Origem (protocolo + domínio + porta) de uma URL do .env; vazio se inválida.
function origin(url) {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

// Hash de cada <script> inline do HTML: só esses textos exatos podem rodar.
export function inlineScriptHashes(html) {
  const hashes = []
  for (const [, body] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    hashes.push(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
  }
  return hashes
}

export function buildCsp({ supabaseUrl, apiUrl, captcha, scriptHashes = [] }) {
  const supabase = origin(supabaseUrl)
  const api = origin(apiUrl)
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...scriptHashes, captcha && TURNSTILE],
    'style-src': ["'self'"],
    // data: é o QR Code do app autenticador; o Supabase, as fotos de perfil
    // (link assinado e temporário do Storage).
    'img-src': ["'self'", 'data:', supabase],
    'font-src': ["'self'"],
    'connect-src': ["'self'", supabase, api],
    'frame-src': [captcha ? TURNSTILE : "'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  return Object.entries(directives)
    .map(([name, values]) => [name, ...new Set(values.filter(Boolean))].join(' '))
    .join('; ')
}

// Plugin do Vite: coloca a <meta> com a política no index.html do build.
export function cspPlugin(env) {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = buildCsp({
        supabaseUrl: env.VITE_SUPABASE_URL,
        apiUrl: env.VITE_API_URL || 'http://localhost:3000',
        captcha: Boolean(env.VITE_TURNSTILE_SITE_KEY),
        scriptHashes: inlineScriptHashes(html),
      })
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }]
    },
  }
}
