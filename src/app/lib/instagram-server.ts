import type { SupabaseClient } from '@supabase/supabase-js'

// Server-only: chamadas à API do Instagram. Nunca importar em componentes 'use client'.
//
// Dois tipos de conexão:
//  - 'facebook'  → login unificado (Facebook Login para Empresas). Token de usuário do sistema,
//                  não expira. Host graph.facebook.com; as rotas usam o ID da conta do Instagram.
//  - 'instagram' → Login com Instagram (apps antigos / token manual). Host graph.instagram.com,
//                  rotas com "me", token de ~60 dias renovável.

export const GRAPH_VERSION = 'v22.0'
export type ApiHost = 'facebook' | 'instagram'
export const GRAPH_BASE: Record<ApiHost, string> = {
  facebook: `https://graph.facebook.com/${GRAPH_VERSION}`,
  instagram: `https://graph.instagram.com/${GRAPH_VERSION}`,
}

const DEFAULT_TTL_SECONDS = 60 * 24 * 3600

export type IgAccount = {
  client_id: string
  ig_user_id: string | null
  username: string | null
  access_token: string
  token_expires_at: string | null
  api_host: ApiHost
  via_agency?: boolean
  /** Conectado só pelo @ (dados públicos via Business Discovery) — sem token próprio. */
  public_mode?: boolean
}

/** Marcador de conta acompanhada só pelo @ (Business Discovery). */
export const DISCOVERY_TOKEN_MARKER = '__discovery__'

export async function getIgAccount(db: SupabaseClient, clientId: string): Promise<IgAccount | null> {
  const { data, error } = await db
    .from('instagram_accounts')
    .select('client_id, ig_user_id, username, access_token, token_expires_at, api_host')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler conta do Instagram: ${error.message}`)
  const acc = (data as IgAccount | null) ?? null
  if (acc && acc.access_token === AGENCY_TOKEN_MARKER) {
    acc.via_agency = true
    acc.access_token = process.env.META_AGENCY_TOKEN ?? ''
  }
  if (acc && acc.access_token === DISCOVERY_TOKEN_MARKER) {
    acc.public_mode = true
    acc.access_token = ''
  }
  return acc
}

/* ─── Conexão pela BM da agência ───────────────────────────────────────────────
 * Um usuário do sistema da BM da Ráfia Colab (token em META_AGENCY_TOKEN, não expira)
 * enxerga todas as contas do Instagram que estão na BM ou foram compartilhadas com ela
 * por clientes (parceiro). No banco, o cliente guarda só o ID da conta + este marcador. */
export const AGENCY_TOKEN_MARKER = '__agency__'

export function agencyToken(): string {
  const t = process.env.META_AGENCY_TOKEN
  if (!t) throw new Error('META_AGENCY_TOKEN não configurado na Vercel.')
  return t
}

export type AgencyIgAccount = { id: string; username: string; name?: string }

/** Lista as contas do Instagram acessíveis pelo usuário do sistema da agência. */
export async function listAgencyAccounts(): Promise<AgencyIgAccount[]> {
  const t = encodeURIComponent(agencyToken())
  const fb = GRAPH_BASE.facebook
  const found = new Map<string, AgencyIgAccount>()
  const errors: string[] = []

  const add = (id?: string, username?: string, name?: string) => {
    if (id && !found.has(id)) found.set(id, { id, username: username ?? '', name })
  }

  // Busca paginada (até 10 páginas) num endpoint
  const crawl = async (url: string, pick: (row: Record<string, unknown>) => void) => {
    let next: string | undefined = url
    for (let i = 0; next && i < 10; i++) {
      const r = await getJson(next)
      if (!r.ok) { if (r.body.error?.message) errors.push(r.body.error.message); return }
      for (const row of (r.body.data as Record<string, unknown>[] | undefined) ?? []) pick(row)
      next = (r.body.paging as { next?: string } | undefined)?.next
    }
  }

  // 1) Contas do Instagram atribuídas ao usuário do sistema
  await crawl(`${fb}/me/assigned_instagram_accounts?fields=id,username&limit=100&access_token=${t}`,
    row => add(row.id as string, row.username as string))
  // 2) Contas ligadas às Páginas atribuídas ao usuário do sistema
  await crawl(`${fb}/me/accounts?fields=name,instagram_business_account{id,username}&limit=100&access_token=${t}`,
    row => {
      const ig = row.instagram_business_account as { id?: string; username?: string } | undefined
      add(ig?.id, ig?.username, row.name as string)
    })

  if (!found.size && errors.length) throw new Error(errors[0])
  return Array.from(found.values()).sort((a, b) => a.username.localeCompare(b.username))
}

/** Vincula um cliente a uma conta do Instagram da BM da agência. */
export async function saveAgencyConnection(db: SupabaseClient, clientId: string, acc: AgencyIgAccount) {
  const now = new Date().toISOString()
  const { error } = await db.from('instagram_accounts').upsert({
    client_id: clientId,
    ig_user_id: acc.id,
    username: acc.username,
    access_token: AGENCY_TOKEN_MARKER,
    token_expires_at: null,
    api_host: 'facebook',
    business_id: null,
    last_refresh_at: null,
    last_error: null,
    connected_at: now,
    updated_at: now,
  }, { onConflict: 'client_id' })
  if (error) throw new Error(`Falha ao salvar: ${error.message}`)
}

/** Monta a URL da API para uma rota "me/..." usada pelo front, conforme o tipo de conexão. */
export function graphUrl(acc: IgAccount, apiPath: string): string {
  let path = apiPath
  if (acc.api_host === 'facebook' && (path === 'me' || path.startsWith('me/'))) {
    if (!acc.ig_user_id) throw new Error('Conta do Instagram sem ID salvo — reconecte.')
    path = acc.ig_user_id + path.slice(2)
  }
  return `${GRAPH_BASE[acc.api_host]}/${path}`
}

type GraphErr = { error?: { message?: string } }

async function getJson(url: string): Promise<{ ok: boolean; body: Record<string, unknown> & GraphErr }> {
  const res = await fetch(url, { cache: 'no-store' })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & GraphErr
  return { ok: res.ok && !body.error, body }
}

export type ResolvedToken = { host: ApiHost; igUserId: string; username: string; businessId: string | null }

/**
 * Descobre que tipo de token é e qual conta do Instagram ele acessa.
 * Ordem: usuário do sistema (login unificado) → token de usuário do Facebook → token do Login com Instagram.
 */
export async function resolveToken(token: string): Promise<ResolvedToken> {
  const t = encodeURIComponent(token)
  const fb = GRAPH_BASE.facebook
  let lastError = 'Token inválido.'

  // 1) Login unificado: token de usuário do sistema
  const a = await getJson(`${fb}/me/assigned_instagram_accounts?fields=id,username&access_token=${t}`)
  if (a.ok) {
    const first = (a.body.data as { id: string; username?: string }[] | undefined)?.[0]
    if (first?.id) {
      const b = await getJson(`${fb}/me?fields=client_business_id&access_token=${t}`)
      return {
        host: 'facebook', igUserId: String(first.id), username: String(first.username ?? ''),
        businessId: b.ok && b.body.client_business_id ? String(b.body.client_business_id) : null,
      }
    }
    lastError = 'Nenhuma conta do Instagram foi compartilhada nessa autorização.'
  } else if (a.body.error?.message) lastError = a.body.error.message

  // 2) Token de usuário do Facebook (conta do Instagram ligada a uma Página)
  const p = await getJson(`${fb}/me/accounts?fields=instagram_business_account{id,username}&access_token=${t}`)
  if (p.ok) {
    const page = (p.body.data as { instagram_business_account?: { id: string; username?: string } }[] | undefined)
      ?.find(x => x.instagram_business_account?.id)
    if (page?.instagram_business_account) {
      return {
        host: 'facebook', igUserId: page.instagram_business_account.id,
        username: String(page.instagram_business_account.username ?? ''), businessId: null,
      }
    }
  }

  // 3) Login com Instagram (graph.instagram.com)
  const i = await getJson(`${GRAPH_BASE.instagram}/me?fields=user_id,username&access_token=${t}`)
  if (i.ok) {
    return { host: 'instagram', igUserId: String(i.body.user_id ?? i.body.id ?? ''), username: String(i.body.username ?? ''), businessId: null }
  }
  throw new Error(lastError)
}

/** Renova token do Login com Instagram (precisa ter 24h+). Tokens do login unificado não expiram. */
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

/** Salva/atualiza a conexão de um cliente. */
export async function saveConnection(db: SupabaseClient, clientId: string, token: string, r: ResolvedToken) {
  const now = new Date().toISOString()
  let finalToken = token
  let expiresAt: string | null = null
  let refreshedAt: string | null = null
  if (r.host === 'instagram') {
    const refreshed = await refreshToken(token)
    finalToken = refreshed?.token ?? token
    expiresAt = refreshed?.expiresAt ?? defaultExpiry()
    refreshedAt = refreshed ? now : null
  }
  const { error } = await db.from('instagram_accounts').upsert({
    client_id: clientId,
    ig_user_id: r.igUserId,
    username: r.username,
    access_token: finalToken,
    token_expires_at: expiresAt,
    api_host: r.host,
    business_id: r.businessId,
    last_refresh_at: refreshedAt,
    last_error: null,
    connected_at: now,
    updated_at: now,
  }, { onConflict: 'client_id' })
  if (error) throw new Error(`Falha ao salvar: ${error.message}`)
}
