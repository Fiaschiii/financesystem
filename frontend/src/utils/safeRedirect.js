// Para onde voltar depois do login / código do app autenticador. Só aceita
// caminhos DESTE site: "/history" sim; "//site.com", "/\site.com" (o
// navegador trata "\" como "/") ou "https://site.com" não. Assim, um link
// montado de propósito não manda a pessoa para outro site logo depois de
// ela digitar o código.
export function safeRedirectPath(path, fallback = '/') {
  if (typeof path !== 'string' || !path.startsWith('/')) return fallback
  if (path.startsWith('//') || path.includes('\\')) return fallback
  // Caracteres de controle (tab, quebra de linha) que o navegador descarta
  // antes de ler o endereço.
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback
  return path
}
