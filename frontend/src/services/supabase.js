import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (isSupabaseConfigured && !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(supabaseUrl)) {
  console.warn(
    `VITE_SUPABASE_URL não parece ser a URL da API do Supabase: "${supabaseUrl}". ` +
    'Deveria ser algo como "https://xxxxxxxx.supabase.co" (o campo "Project URL" em ' +
    'Settings > API Keys) — não a URL da página de configurações do painel.'
  )
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null