import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js'

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

if (isSupabaseConfigured && !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(SUPABASE_URL)) {
  console.warn(
    `SUPABASE_URL não parece ser a URL da API do Supabase: "${SUPABASE_URL}". ` +
    'Deveria ser algo como "https://xxxxxxxx.supabase.co" (o campo "Project URL" em ' +
    'Settings > API Keys) — não a URL da página de configurações do painel.'
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { global: { fetch: fetchWithTimeout } })
  : null