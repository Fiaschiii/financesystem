import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { isMfaPending } from '../utils/mfa.js'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // As funções não dependem da sessão: são criadas uma vez só. Assim dá para
  // usá-las como dependência de useEffect sem disparar buscas à toa.
  const actions = useMemo(
    () => ({
      // captchaToken: comprovante do CAPTCHA (vazio quando ele está desligado).
      signUp: (email, password, captchaToken) =>
        supabase.auth.signUp({ email, password, options: withCaptcha(captchaToken) }),
      signIn: (email, password, captchaToken) =>
        supabase.auth.signInWithPassword({ email, password, options: withCaptcha(captchaToken) }),
      // scope 'local': sai só deste navegador (usado no fim por inatividade,
      // para não derrubar a sessão do celular junto). Sem nada: o padrão.
      signOut: (options) => supabase.auth.signOut(options),
      resetPassword: (email, captchaToken) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
          ...withCaptcha(captchaToken),
        }),
      // nonce: código enviado por e-mail pelo reauthenticate(), quando o
      // Supabase pede para confirmar a identidade antes de trocar a senha
      // ("Secure password change" ligado e login antigo).
      updatePassword: (newPassword, nonce) =>
        supabase.auth.updateUser(nonce ? { password: newPassword, nonce } : { password: newPassword }),
      reauthenticate: () => supabase.auth.reauthenticate(),
      // Troca de e-mail: o Supabase manda um link de confirmação (com "Secure
      // email change", para o e-mail antigo e o novo). Só vale depois do clique.
      updateEmail: (email) =>
        supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/profile` }),

      // Verificação em duas etapas (app autenticador, TOTP).
      listFactors: () => supabase.auth.mfa.listFactors(),
      enrollTotp: () =>
        supabase.auth.mfa.enroll({
          factorType: 'totp',
          // O nome que aparece no app autenticador, acima do código.
          issuer: 'Controle Financeiro',
          friendlyName: 'App autenticador',
        }),
      verifyTotp: (factorId, code) => supabase.auth.mfa.challengeAndVerify({ factorId, code }),
      // Depois de remover, renova a sessão: a lista de apps guardada nela
      // (que decide se o código é pedido) fica atualizada na hora.
      unenrollFactor: async (factorId) => {
        const result = await supabase.auth.mfa.unenroll({ factorId })
        if (!result.error) await supabase.auth.refreshSession()
        return result
      },
    }),
    []
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      // Entrou com a senha, mas ainda falta o código do app.
      mfaPending: isMfaPending(session),
      ...actions,
    }),
    [session, loading, actions]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function withCaptcha(captchaToken) {
  return captchaToken ? { captchaToken } : {}
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider')
  }
  return context
}
