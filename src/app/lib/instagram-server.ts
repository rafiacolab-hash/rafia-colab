import type { SupabaseClient } from '@supabase/supabase-js'

// Server-only: chamadas à Instagram API (Login com Instagram).
// Nunca importar este arquivo em componentes 'use client'.

export const IG_API_VERSION = 'v22.0'
export const IG_GRAPH = `https://graph.instagram.com/${IG_API_VERSION}`

/** Tokens de longa duração valem ~60 dias. */
const DEFAULT_TTL_SECONDS = 60 * 24 * 3600

export type IgAccount = {
  client_id: string
  ig_user_id: string | null
  username: string | null
  access_token: string
  token_expires_at: string | null
}

export async function getIgAccount(db: SupabaseClient, clientId: string): Promise<IgAccount | null> {
  const { data, error } = await db
    .from('instagram_accounts')
    .select('client_id, ig_user_id, username, access_token, token_expires_at')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler conta do Instagram: ${error.message}`)
  return (data as IgAccount | null) ?? null
}

/** Valida um token chamando /me. Lança erro com a mensagem da Meta se inválido. */
export async function validateToken(token: string): Promise<{ igUserId: string; username: string }> {
  const res = await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`, { cache: 'no-store' })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body || body.error) {
    throw new Error(body?.error?.message || `Token inválido (HTTP ${res.status}).`)
  }
  return { igUserId: String(body.user_id ?? body.id ?? ''), username: String(body.username ?? '') }
}

/**
 * Renova um token de longa duração (precisa ter pelo menos 24h de vida).
 * Retorna null se a Meta recusar (ex.: token recém-gerado).
 */
export async function refreshToken(token: string): Promise<{ token: string; expiresAt: string } | null> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  )
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.access_token) return null
  const ttl = Number(body.expires_in) || DEFAULT_TTL_SECONDS
  return { token: String(body.access_token), expiresAt: new Date(Date.now() + ttl * 1000).toISOString() }
}

export function defaultExpiry(): string {
  return new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000).toISOString()
}
