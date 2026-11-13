import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ptBR from '../../src/i18n/pt-BR.js'
import en from '../../src/i18n/en.js'
import {
  I18nProvider,
  Trans,
  applyLanguage,
  detectLanguage,
  getLanguage,
  translate,
  useI18n,
} from '../../src/i18n/index.jsx'
import { formatBRL, formatInputBRL, parseBRL } from '../../src/utils/currency.js'
import { formatDayMonth, formatMonthYear, formatShortMonthYear } from '../../src/utils/date.js'
import { typeLabel } from '../../src/utils/expenses.js'
import { translateAuthError } from '../../src/utils/authErrors.js'
import { apiFetch } from '../../src/services/api.js'
import Login from '../../src/pages/Login.jsx'

vi.mock('../../src/hooks/useAuth.jsx', () => ({ useAuth: () => ({ signIn: vi.fn() }) }))

// Os testes de outros arquivos rodam em português: cada teste daqui que
// muda o idioma volta ao padrão no fim.
afterEach(() => {
  applyLanguage('pt-BR')
  localStorage.clear()
})

describe('dicionários', () => {
  it('português e inglês têm exatamente as mesmas chaves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort())
  })

  it('o mesmo tipo em cada chave (texto ou função de plural) e os mesmos {parâmetros}', () => {
    for (const key of Object.keys(ptBR)) {
      expect(typeof en[key], key).toBe(typeof ptBR[key])
      if (typeof ptBR[key] === 'string') {
        const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
        expect(params(en[key]), key).toEqual(params(ptBR[key]))
      }
    }
  })

  it('nenhum texto vazio', () => {
    for (const [key, value] of [...Object.entries(ptBR), ...Object.entries(en)]) {
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('')
    }
  })
})

describe('translate', () => {
  it('troca {parâmetros} e usa funções para plural', () => {
    expect(translate('salary.label', { month: 'Outubro/2026' })).toBe('Salário de Outubro/2026')
    expect(translate('salary.label', { month: 'October 2026' }, 'en')).toBe('Salary for October 2026')
    expect(translate('sessions.revokedOthers', { count: 1 }, 'en')).toBe('1 session ended.')
    expect(translate('sessions.revokedOthers', { count: 3 })).toBe('3 sessões encerradas.')
  })

  it('chave inexistente devolve a própria chave (fácil de achar na tela)', () => {
    expect(translate('nao.existe')).toBe('nao.existe')
  })
})

describe('idioma inicial', () => {
  it('usa a escolha salva neste navegador', () => {
    localStorage.setItem('idioma', 'en')
    expect(detectLanguage()).toBe('en')
  })

  it('sem escolha, segue o idioma do navegador', () => {
    const spy = vi.spyOn(navigator, 'language', 'get')
    spy.mockReturnValue('en-GB')
    expect(detectLanguage()).toBe('en')
    spy.mockReturnValue('pt-BR')
    expect(detectLanguage()).toBe('pt-BR')
    spy.mockReturnValue('es-ES')
    expect(detectLanguage()).toBe('pt-BR')
  })

  it('valor estranho salvo é ignorado', () => {
    localStorage.setItem('idioma', '<script>')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR')
    expect(detectLanguage()).toBe('pt-BR')
  })
})

describe('formatação segue o idioma', () => {
  it('moeda: sempre real, escrita de cada idioma', () => {
    expect(formatBRL(1200.5)).toMatch(/R\$\s1\.200,50/)
    applyLanguage('en')
    expect(formatBRL(1200.5)).toBe('R$1,200.50')
    expect(formatInputBRL(1200.5)).toBe('1200.50')
  })

  it('em inglês, lê "1,200.50" (vírgula de milhar, ponto decimal)', () => {
    applyLanguage('en')
    expect(parseBRL('1,200.50')).toBe(1200.5)
    expect(parseBRL('R$ 1,200')).toBe(1200)
    expect(parseBRL('55.9')).toBe(55.9)
    expect(parseBRL('1,20')).toBeNaN()
    expect(parseBRL('1.2.3')).toBeNaN()
  })

  it('meses e datas', () => {
    expect(formatMonthYear(10, 2026)).toBe('Outubro/2026')
    expect(formatDayMonth('2026-10-05')).toBe('05/10')
    applyLanguage('en')
    expect(formatMonthYear(10, 2026)).toBe('October 2026')
    expect(formatDayMonth('2026-10-05')).toBe('10/05')
    expect(formatShortMonthYear(10, 2026)).toBe('Oct/26')
  })

  it('tipo do gasto e erros do Supabase', () => {
    applyLanguage('en')
    expect(typeLabel('variavel')).toBe('Variable')
    expect(translateAuthError('Invalid login credentials')).toBe('Incorrect email or password.')
    expect(translateAuthError({ message: 'x', code: 'same_password' })).toBe(
      'The new password must be different from the current one.'
    )
  })
})

describe('I18nProvider', () => {
  function Switcher() {
    const { t, setLanguage } = useI18n()
    return (
      <>
        <p>{t('nav.summary')}</p>
        <p>{formatMonthYear(1, 2027)}</p>
        <button type="button" onClick={() => setLanguage('en')}>en</button>
      </>
    )
  }

  it('trocar o idioma redesenha os textos e as datas, marca o <html lang> e lembra a escolha', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <Switcher />
      </I18nProvider>
    )
    expect(screen.getByText('Resumo')).toBeInTheDocument()
    expect(screen.getByText('Janeiro/2027')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'en' }))

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('January 2027')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('idioma')).toBe('en')
    expect(getLanguage()).toBe('en')
  })

  it('uma página inteira em inglês (Entrar)', () => {
    render(
      <I18nProvider initialLanguage="en">
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </I18nProvider>
    )
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Forgot my password/ })).toBeInTheDocument()
  })

  it('Trans encaixa elementos no meio do texto', () => {
    render(<Trans k="mfa.step1" plus={<strong>+</strong>} other={<em>Outra conta</em>} />)
    expect(screen.getByText('+').tagName).toBe('STRONG')
    expect(screen.getByText('Outra conta').tagName).toBe('EM')
  })
})

describe('chamadas à API levam o idioma', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('Accept-Language com o idioma ativo (o backend traduz os erros)', async () => {
    await act(async () => {
      applyLanguage('en')
      await apiFetch('/api/profile')
    })
    expect(fetch.mock.calls[0][1].headers['Accept-Language']).toBe('en')
  })

  it('mensagem de backend fora do ar no idioma ativo', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    applyLanguage('en')
    await expect(apiFetch('/api/x')).rejects.toThrow(/Could not reach the backend/)
  })
})
