import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../services/api.js'
import { useAuth } from './useAuth.jsx'
import { useI18n } from '../i18n/index.jsx'
import { isTheme, setTheme } from '../utils/theme.js'
import { hasVerifiedFactor } from '../utils/mfa.js'

// Perfil de quem está logado (Minha conta): nome, telefone, foto e
// preferências. Vem do backend (GET /api/profile), que identifica a pessoa
// pelo token; o frontend nunca manda um id de usuário.
//
// Ao carregar, aplica o idioma e o tema salvos no perfil: a preferência
// acompanha a pessoa em qualquer navegador.

const ProfileContext = createContext(null)

// O link da foto vale 1 hora (ver backend): renova antes disso.
const REFRESH_MS = 45 * 60 * 1000

export function ProfileProvider({ children }) {
  const { user, mfaPending } = useAuth()
  const { setLanguage } = useI18n()
  const userId = user && !mfaPending ? user.id : null
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback(
    (data) => {
      setProfile(data)
      setLanguage(data.language) // ignora valor fora da lista
      if (isTheme(data.theme)) setTheme(data.theme)
      return data
    },
    [setLanguage]
  )

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/api/profile')
      apply(data.profile)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, apply])

  useEffect(() => {
    load()
    if (!userId) return undefined
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load, userId])

  // As três lançam o erro para quem chamou mostrar a mensagem.
  const updateProfile = useCallback(
    async (fields) => {
      const data = await apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(fields) })
      return apply(data.profile)
    },
    [apply]
  )

  const uploadAvatar = useCallback(
    async (blob) => {
      const data = await apiFetch('/api/profile/avatar', {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type },
      })
      return apply(data.profile)
    },
    [apply]
  )

  const removeAvatar = useCallback(async () => {
    const data = await apiFetch('/api/profile/avatar', { method: 'DELETE' })
    return apply(data.profile)
  }, [apply])

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      reload: load,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      // Da sessão (atualiza na hora ao ativar/desativar), não do perfil.
      mfaEnabled: hasVerifiedFactor(user),
      notifications: notificationsOf(profile),
      // Conta de demonstração do portfólio: senha, e-mail, MFA, nome,
      // telefone, foto e sessões ficam travados (o banco também confere).
      isDemo: profile?.is_demo === true,
    }),
    [profile, loading, error, load, updateProfile, uploadAvatar, removeAvatar, user]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

// Avisos ligados por padrão (enquanto o perfil não chega, também).
export function notificationsOf(profile) {
  return {
    budget: profile?.notify_budget_alerts ?? true,
    salary: profile?.notify_missing_salary ?? true,
    mfa: profile?.notify_mfa_reminder ?? true,
  }
}

// Fora do provider (testes de componentes isolados): sem perfil, avisos de
// caixinha e salário ligados, sem lembrete de MFA.
const fallback = {
  profile: null,
  loading: false,
  error: '',
  reload: async () => {},
  updateProfile: async () => null,
  uploadAvatar: async () => null,
  removeAvatar: async () => null,
  mfaEnabled: true,
  notifications: notificationsOf(null),
  isDemo: false,
}

export function useProfile() {
  return useContext(ProfileContext) ?? fallback
}
