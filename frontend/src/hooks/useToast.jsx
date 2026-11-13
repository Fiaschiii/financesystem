import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useI18n } from '../i18n/index.jsx'

// Avisos rápidos no canto da tela ("Gasto adicionado."), que somem sozinhos.
// Uso: const toast = useToast(); toast('Gasto salvo.') ou toast('Falhou', 'error')
const ToastContext = createContext(null)
const DURATION_MS = 4000

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const { t } = useI18n()

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message, tone = 'success') => {
      const id = nextId++
      // No máximo 3 na tela: o mais antigo sai.
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS))
    },
    [dismiss]
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: leitores de tela anunciam o aviso sem tirar o foco do lugar. */}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            <Icon name={toast.tone === 'error' ? 'alert' : 'check'} />
            <span>{toast.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label={t('common.closeToast')}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Fora do provider (ex.: num teste de um componente isolado) não faz nada.
const noop = () => {}

export function useToast() {
  return useContext(ToastContext) ?? noop
}
