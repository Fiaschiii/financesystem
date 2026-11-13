import { Fragment, createContext, useCallback, useContext, useMemo, useState } from 'react'
import ptBR from './pt-BR.js'
import en from './en.js'

// Idioma da interface (Etapa 18). Sem biblioteca: um dicionário por idioma,
// com as mesmas chaves, e a função t('chave', { parametros }).
//
// - Logado: o idioma vem do perfil (Minha conta > Preferências), guardado no
//   banco, e acompanha a pessoa em qualquer aparelho.
// - Antes de entrar: a última escolha deste navegador ou, na primeira
//   visita, o idioma do navegador.
// O idioma ativo também fica numa variável do módulo, para as funções de
// formatação (moeda, datas) que não são componentes React.

export const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
  { value: 'en', label: 'English', short: 'EN' },
]
export const DEFAULT_LANGUAGE = 'pt-BR'
const DICTIONARIES = { 'pt-BR': ptBR, en }
const STORAGE_KEY = 'idioma'

let activeLanguage = DEFAULT_LANGUAGE

export function isLanguage(value) {
  return Object.hasOwn(DICTIONARIES, value)
}

// Escolha salva neste navegador; senão, o idioma do navegador.
export function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // sem localStorage: segue para o idioma do navegador
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language ?? '' : ''
  return /^en\b/i.test(browser) ? 'en' : DEFAULT_LANGUAGE
}

export function getLanguage() {
  return activeLanguage
}

// Locale do Intl (moeda, números, datas).
export function getLocale(language = activeLanguage) {
  return language === 'en' ? 'en-US' : 'pt-BR'
}

export function applyLanguage(language) {
  activeLanguage = isLanguage(language) ? language : DEFAULT_LANGUAGE
  if (typeof document !== 'undefined') document.documentElement.lang = activeLanguage
  try {
    localStorage.setItem(STORAGE_KEY, activeLanguage)
  } catch {
    // vale só nesta aba
  }
}

// t('profile.title') ou t('history.chartTitle', { count: 12 }).
// Valor do dicionário pode ser texto com {parametro} ou uma função (plurais).
// Chave que falta em inglês cai no português; que falta nos dois, a própria chave.
export function translate(key, params = {}, language = activeLanguage) {
  const entry = DICTIONARIES[language]?.[key] ?? ptBR[key]
  if (entry === undefined) return key
  if (typeof entry === 'function') return entry(params)
  return entry.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? String(params[name]) : match))
}

export const t = (key, params) => translate(key, params)

const I18nContext = createContext(null)

export function I18nProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(() => initialLanguage ?? detectLanguage())

  // Atualiza a variável do módulo ANTES de os filhos renderizarem: assim
  // formatBRL e companhia já saem no idioma novo nesta mesma renderização.
  if (activeLanguage !== language) applyLanguage(language)

  const setLanguage = useCallback((value) => {
    if (!isLanguage(value)) return
    applyLanguage(value)
    setLanguageState(value)
  }, [])

  const value = useMemo(
    () => ({ language, setLanguage, t: (key, params) => translate(key, params, language) }),
    [language, setLanguage]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// Texto com elementos no meio (negrito, link):
// <Trans k="mfa.step1" plus={<strong>+</strong>} other={<strong>…</strong>} />
// Cada {nome} do texto vira o elemento de mesmo nome.
export function Trans({ k, ...nodes }) {
  const { t: tr } = useI18n()
  const parts = tr(k).split(/\{(\w+)\}/)
  return parts.map((part, index) =>
    index % 2 === 1 ? <Fragment key={index}>{nodes[part] ?? `{${part}}`}</Fragment> : part
  )
}

// Fora do provider (testes de um componente isolado): português, sem troca.
const fallback = { language: DEFAULT_LANGUAGE, setLanguage: () => {}, t }

export function useI18n() {
  return useContext(I18nContext) ?? fallback
}
