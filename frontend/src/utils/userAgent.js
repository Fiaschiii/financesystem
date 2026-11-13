// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/130 ..." -> { browser: 'Chrome', os: 'Windows' }.
// Só para a lista de sessões ativas: um palpite legível, não uma identificação
// exata (o user agent é informado pelo próprio navegador).

const BROWSERS = [
  [/Edg(A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const SYSTEMS = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/CrOS/, 'ChromeOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

const find = (list, ua) => list.find(([pattern]) => pattern.test(ua))?.[1] ?? null

export function describeUserAgent(ua) {
  const text = ua ?? ''
  return { browser: find(BROWSERS, text), os: find(SYSTEMS, text) }
}

export function isMobileUserAgent(ua) {
  return /Android|iPhone|iPad|iPod|Mobile/.test(ua ?? '')
}
