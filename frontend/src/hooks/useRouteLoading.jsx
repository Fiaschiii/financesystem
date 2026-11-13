import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppLoader from '../components/AppLoader.jsx'

// Tela de carregamento ao trocar de página.
//
// Ao mudar de endereço (/, /history, /settings...), a tela com o logo cobre o
// conteúdo até a página nova avisar que seus dados chegaram (useRouteReady).
// - Fica no mínimo MIN_MS na tela, para não "piscar" quando tudo é rápido.
// - Some depois de MAX_MS mesmo sem aviso, para nunca travar o sistema.
// Trocar só o mês no Resumo (?mes=...) não conta como trocar de página: ali
// continuam os blocos de carregamento (esqueletos) dentro da própria página.
const MIN_MS = 450
const MAX_MS = 10000

const RouteLoadingContext = createContext(null)

export function RouteLoadingProvider({ children }) {
  const { pathname } = useLocation()
  // Cada aviso guarda a página de onde veio: um aviso da página anterior
  // não esconde a tela de carregamento da página nova.
  const [readyPath, setReadyPath] = useState(null)
  const [minDonePath, setMinDonePath] = useState(null)

  useEffect(() => {
    const minTimer = setTimeout(() => setMinDonePath(pathname), MIN_MS)
    const maxTimer = setTimeout(() => setReadyPath(pathname), MAX_MS)
    return () => {
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
    }
  }, [pathname])

  const visible = !(readyPath === pathname && minDonePath === pathname)

  return (
    <RouteLoadingContext.Provider value={setReadyPath}>
      {children}
      <AppLoader visible={visible} />
    </RouteLoadingContext.Provider>
  )
}

// Chamado pela página: useRouteReady(!loading). Só o primeiro "pronto" conta;
// recarregamentos depois disso (ex.: trocar o mês) não trazem a tela de volta.
export function useRouteReady(ready) {
  const markReady = useContext(RouteLoadingContext)
  const { pathname } = useLocation()

  useEffect(() => {
    if (ready && markReady) markReady(pathname)
  }, [ready, markReady, pathname])
}
