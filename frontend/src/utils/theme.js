// Tema da interface: 'auto' (segue o sistema), 'light' ou 'dark'.
// A escolha fica no perfil (Minha conta > Preferências, gravado no banco) e
// também no navegador (localStorage): o index.html aplica antes de a página
// aparecer, sem "piscar" branco, e o perfil confirma depois do login.
const STORAGE_KEY = 'tema'
export const THEMES = [
  { value: 'auto', labelKey: 'theme.auto' },
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
]

export function isTheme(value) {
  return THEMES.some((theme) => theme.value === value)
}

export function getTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'auto'
  } catch {
    return 'auto'
  }
}

export function setTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme
  } else {
    delete root.dataset.theme
  }
  try {
    if (theme === 'auto') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Navegador sem localStorage (modo privado restrito): vale só nesta aba.
  }
}
