import { cookies } from 'next/headers'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Helpers server-only para rotas de API que precisam saber QUEM está chamando.
// O JWT do cookie é validado no Supabase Auth (auth.getUser), não só decodificado.

const COOKIE_NAME = 'sb-sbqefuorlrcaxqciylkr-auth-token'

export type Caller = {
  userId: string
  role: 'admin' | 'assistant' | 'client'
  clientId: string | null
}

function parseAccessTokenFromRaw(raw: string): string | null {
  try {
    let value = raw
    if (value.startsWith('base64-')) {
      value = Buffer.from(value.slice(7), 'base64').toString('utf-8')
    }
    const parsed = JSON.parse(value)
    return parsed?.access_token ?? parsed?.[0]?.access_token ?? null
  } catch {
    return null
  }
}

async function getAccessTokenFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies()

  const direct = cookieStore.get(COOKIE_NAME)?.value
  if (direct) {
    const token = parseAccessTokenFromRaw(decodeURIComponent(direct))
    if (token) return token
  }

  const chunks: string[] = []
  for (let i = 0; ; i++) {
    const chunk = cookieStore.get(`${COOKIE_NAME}.${i}`)?.value
    if (chunk === undefined) break
    chunks.push(decodeURIComponent(chunk))
  }
  return chunks.length > 0 ? parseAccessTokenFromRaw(chunks.join('')) : null
}

/** Cliente com service_role — bypassa RLS. Usar SOMENTE em rotas de servidor. */
export function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Retorna o usuário logado (validado) com role e cliente vinculado, ou null. */
export async function getCaller(): Promise<Caller | null> {
  const accessToken = await getAccessTokenFromServerCookies()
  if (!accessToken) return null

  const admin = serviceClient()
  const { data: userData, error: userErr } = await admin.auth.getUser(accessToken)
  if (userErr || !userData?.user) return null

  const { data: profile } = await admin
    .from('users_profile')
    .select('role, client_id')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!profile?.role) return null

  return {
    userId: userData.user.id,
    role: profile.role as Caller['role'],
    clientId: (profile.client_id as string | null) ?? null,
  }
}

/** Admin/assistente veem todos os clientes; usuário "client" só o próprio. */
export function canAccessClient(caller: Caller, clientId: string): boolean {
  if (caller.role === 'admin' || caller.role === 'assistant') return true
  return caller.role === 'client' && caller.clientId === clientId
}
