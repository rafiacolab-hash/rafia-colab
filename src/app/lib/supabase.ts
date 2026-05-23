import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PROJECT_REF = 'sbqefuorlrcaxqciylkr'

// ─── Auth client (SSR) ────────────────────────────────────────────────────────
// Usado apenas para: login, logout, onAuthStateChange
// NÃO use para queries de dados — o lock interno do auth-js trava chamadas concorrentes
export const createClient = () =>
  createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// Lê o access token diretamente do cookie sem passar pelo lock do auth-js
function getAccessTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const cookieName = `sb-${PROJECT_REF}-auth-token`
  const all = document.cookie.split(';')
  const raw = all.find(c => c.trim().startsWith(cookieName + '='))
  if (!raw) return null
  try {
    let value = decodeURIComponent(raw.trim().slice(cookieName.length + 1))
    // Supabase ≥2.x pode armazenar o cookie com prefixo "base64-<base64encodedJSON>"
    if (value.startsWith('base64-')) {
      value = atob(value.slice(7))
    }
    const parsed = JSON.parse(value)
    return parsed?.access_token ?? parsed?.[0]?.access_token ?? null
  } catch {
    return null
  }
}

// Decodifica o JWT do cookie e retorna id + email do usuário logado
// Alternativa síncrona ao getSession() — sem risco de travar
export function getUserFromCookie(): { id: string; email?: string } | null {
  const token = getAccessTokenFromCookie()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload?.sub) return null
    return { id: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

// ─── Data client (supabase-js puro) ──────────────────────────────────────────
// Usado para TODAS as queries de dados (day_entries, clients, etc.)
// Injeta o token via header — não chama getSession(), não trava
export const createDataClient = () => {
  const accessToken = getAccessTokenFromCookie()
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
