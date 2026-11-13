import { useCallback, useEffect, useRef, useState } from 'react'

// Guarda o horário do último uso no navegador: assim, usar o sistema numa
// aba conta para as outras (ninguém é deslogado numa aba esquecida enquanto
// trabalha em outra).
export const ACTIVITY_KEY = 'ultima-atividade'
const STORAGE_WRITE_INTERVAL = 5000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']

function readShared() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeShared(time) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(time))
  } catch {
    // Sem localStorage (aba anônima bloqueada): vale só a aba atual.
  }
}

// Conta o tempo sem uso. Faltando warningMs para o fim, devolve secondsLeft
// (para o aviso); no fim, chama onTimeout uma vez.
// Durante o aviso, mexer o mouse não basta: a pessoa precisa clicar em
// "Continuar conectado" (stayActive), para o aviso não sumir sem ser lido.
export function useIdleTimer({ enabled, timeoutMs, warningMs, onTimeout }) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const lastActivity = useRef(Date.now())
  const lastWrite = useRef(0)
  const warning = useRef(false)
  const fired = useRef(false)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const touch = useCallback(() => {
    const now = Date.now()
    lastActivity.current = now
    if (now - lastWrite.current >= STORAGE_WRITE_INTERVAL) {
      lastWrite.current = now
      writeShared(now)
    }
  }, [])

  const stayActive = useCallback(() => {
    lastWrite.current = 0 // grava já, para as outras abas saberem
    touch()
    warning.current = false
    setSecondsLeft(null)
  }, [touch])

  useEffect(() => {
    if (!enabled) return undefined
    fired.current = false
    stayActive()

    const onActivity = () => {
      if (!warning.current) touch()
    }

    const check = () => {
      if (fired.current) return
      const last = Math.max(lastActivity.current, readShared())
      const remaining = timeoutMs - (Date.now() - last)
      if (remaining <= 0) {
        fired.current = true
        warning.current = false
        setSecondsLeft(null)
        onTimeoutRef.current()
      } else if (remaining <= warningMs) {
        warning.current = true
        setSecondsLeft(Math.ceil(remaining / 1000))
      } else if (warning.current) {
        // Outra aba foi usada: o aviso some sozinho.
        warning.current = false
        setSecondsLeft(null)
      }
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }))
    // Ao voltar para a aba (ou o notebook acordar), confere na hora.
    document.addEventListener('visibilitychange', check)
    const interval = setInterval(check, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity, { capture: true }))
      document.removeEventListener('visibilitychange', check)
      clearInterval(interval)
      warning.current = false
      setSecondsLeft(null)
    }
  }, [enabled, timeoutMs, warningMs, touch, stayActive])

  return { secondsLeft, stayActive }
}
