import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastProvider, useToast } from '../../src/hooks/useToast.jsx'

function Trigger({ message = 'Gasto salvo.', tone }) {
  const toast = useToast()
  return <button onClick={() => toast(message, tone)}>disparar</button>
}

afterEach(() => vi.useRealTimers())

describe('avisos rápidos (toast)', () => {
  it('aparece numa região anunciada a leitores de tela e some sozinho', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('disparar'))

    const region = screen.getByText('Gasto salvo.').closest('[aria-live]')
    expect(region).toHaveAttribute('aria-live', 'polite')

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Gasto salvo.')).not.toBeInTheDocument()
  })

  it('pode ser fechado no X', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('disparar'))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByText('Gasto salvo.')).not.toBeInTheDocument()
  })

  it('mostra no máximo 3 de uma vez', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    )
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('disparar'))
    expect(screen.getAllByText('Gasto salvo.')).toHaveLength(3)
  })

  it('fora do provider, não quebra a tela', () => {
    render(<Trigger />)
    expect(() => fireEvent.click(screen.getByText('disparar'))).not.toThrow()
  })
})
