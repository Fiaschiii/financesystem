import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { RouteLoadingProvider, useRouteReady } from '../../src/hooks/useRouteLoading.jsx'

// Página de teste: fica "carregando" até o teste liberar.
// (A key em cada rota faz A e B serem páginas distintas, como no sistema real.)
let releasePage
function SlowPage({ name }) {
  const [ready, setReady] = React.useState(false)
  releasePage = () => setReady(true)
  useRouteReady(ready)
  return (
    <div>
      {name}
      <Link to="/b">ir para B</Link>
      <Link to="/a?mes=2026-10">trocar mês</Link>
    </div>
  )
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/a']}>
      <RouteLoadingProvider>
        <Routes>
          <Route path="/a" element={<SlowPage key="a" name="Página A" />} />
          <Route path="/b" element={<SlowPage key="b" name="Página B" />} />
        </Routes>
      </RouteLoadingProvider>
    </MemoryRouter>
  )
}

const loader = () => document.querySelector('.app-loader')
const isVisible = () => !loader().classList.contains('app-loader--hidden')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('tela de carregamento entre páginas', () => {
  it('usa o mesmo ícone da aba do navegador', () => {
    renderApp()
    expect(loader().querySelector('img')).toHaveAttribute('src', '/favicon.svg')
  })

  it('cobre a página até ela avisar que carregou', () => {
    renderApp()
    act(() => vi.advanceTimersByTime(2000))
    expect(isVisible()).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')

    act(() => releasePage())
    expect(isVisible()).toBe(false)
  })

  it('fica um tempo mínimo na tela, para não piscar', () => {
    renderApp()
    act(() => releasePage())
    expect(isVisible()).toBe(true)
    act(() => vi.advanceTimersByTime(450))
    expect(isVisible()).toBe(false)
  })

  it('volta ao trocar de página e espera a página nova', () => {
    renderApp()
    act(() => releasePage())
    act(() => vi.advanceTimersByTime(500))
    expect(isVisible()).toBe(false)

    fireEvent.click(screen.getByText('ir para B'))
    expect(screen.getByText('Página B')).toBeInTheDocument()
    expect(isVisible()).toBe(true)

    act(() => vi.advanceTimersByTime(500))
    expect(isVisible()).toBe(true)
    act(() => releasePage())
    expect(isVisible()).toBe(false)
  })

  it('trocar só o mês (?mes=) não traz a tela de volta', () => {
    renderApp()
    act(() => releasePage())
    act(() => vi.advanceTimersByTime(500))

    fireEvent.click(screen.getByText('trocar mês'))
    expect(isVisible()).toBe(false)
  })

  it('nunca trava: some sozinha depois de 10 segundos', () => {
    renderApp()
    act(() => vi.advanceTimersByTime(10000))
    expect(isVisible()).toBe(false)
  })
})
