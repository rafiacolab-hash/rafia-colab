import type { SupabaseClient } from '@supabase/supabase-js'
import { AGENCY_TOKEN_MARKER, DISCOVERY_TOKEN_MARKER, GRAPH_BASE } from './instagram-server'

// Server-only: métricas PÚBLICAS de qualquer conta profissional do Instagram, só pelo @.
//
// Usa a Business Discovery API: a conta da Ráfia (já conectada por completo) consulta
// o perfil público de outra conta profissional. Não precisa de senha, convite nem BM do cliente.
// Dá: seguidores, seguindo, nº de posts, bio, foto e, por post, curtidas, comentários, formato e data.
// NÃO dá: alcance, views, contas alcançadas (dados privados do dono da conta).

export type PublicMedia = {
  id: string
  caption?: string
  like_count?: number
  comments_count?: number
  media_type: string
  media_product_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
}

export type PublicProfile = {
  id: string
  username: string
  name?: string
  biography?: string
  profile_picture_url?: string
  followers_count?: number
  follows_count?: number
  media_count?: number
  website?: string
}

const MEDIA_FIELDS = 'id,caption,like_count,comments_count,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp'
const PROFILE_FIELDS = 'id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website'

export function cleanUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0]
    .toLowerCase()
}

/** Conta da agência que faz as consultas (uma conta conectada por completo, ex.: @rafiacolab). */
export async function getDiscoverySource(db: SupabaseClient): Promise<{ igUserId: string; token: string }> {
  const preferred = process.env.META_DISCOVERY_CLIENT_ID
  let q = db.from('instagram_accounts')
    .select('client_id, ig_user_id, access_token, api_host')
    .eq('api_host', 'facebook')
    .not('ig_user_id', 'is', null)
    .not('access_token', 'in', `(${AGENCY_TOKEN_MARKER},${DISCOVERY_TOKEN_MARKER})`)
  if (preferred) q = q.eq('client_id', preferred)
  const { data, error } = await q.limit(1)
  if (error) throw new Error(`Falha ao buscar a conta de origem: ${error.message}`)
  const row = data?.[0]
  if (!row) {
    throw new Error('Para consultar pelo @, conecte por completo pelo menos uma conta da agência (ex.: Ráfia Colab → Métricas → Conectar pelo meu Facebook).')
  }
  return { igUserId: String(row.ig_user_id), token: String(row.access_token) }
}

type DiscoveryResp = {
  business_discovery?: PublicProfile & {
    media?: { data?: PublicMedia[]; paging?: { cursors?: { after?: string } } }
  }
  error?: { message?: string; code?: number; error_subcode?: number }
}

function friendlyDiscoveryError(e: DiscoveryResp['error'], username: string): string {
  const msg = e?.message ?? ''
  if (e?.code === 110 || /cannot find user|invalid user id/i.test(msg)) {
    return `Não encontrei @${username} como conta profissional. A conta precisa ser Empresa ou Criador de conteúdo e pública.`
  }
  if (e?.code === 190) return 'O acesso da conta da agência (Ráfia) expirou ou foi revogado — reconecte a Ráfia em Métricas.'
  if (e?.code === 4 || e?.code === 17 || e?.code === 32) return 'Limite de consultas da Meta atingido. Tente de novo em alguns minutos.'
  return msg || 'Erro ao consultar o Instagram.'
}

/** Busca perfil público + posts recentes (até `maxPosts`, paginando). */
export async function fetchPublicProfile(
  db: SupabaseClient, rawUsername: string, maxPosts = 60,
): Promise<{ profile: PublicProfile; media: PublicMedia[] }> {
  const username = cleanUsername(rawUsername)
  if (!/^[a-z0-9._]{1,30}$/.test(username)) throw new Error('@ inválido.')
  const src = await getDiscoverySource(db)

  const media: PublicMedia[] = []
  let profile: PublicProfile | null = null
  let after: string | undefined
  const pageSize = Math.min(50, maxPosts)

  for (let page = 0; page < 4 && media.length < maxPosts; page++) {
    const mediaPart = after ? `media.after(${after}).limit(${pageSize})` : `media.limit(${pageSize})`
    const fields = `business_discovery.username(${username}){${PROFILE_FIELDS},${mediaPart}{${MEDIA_FIELDS}}}`
    const url = `${GRAPH_BASE.facebook}/${src.igUserId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(src.token)}`
    const res = await fetch(url, { cache: 'no-store' })
    const body = (await res.json().catch(() => ({}))) as DiscoveryResp
    if (!res.ok || body.error || !body.business_discovery) {
      if (page > 0 && profile) break // páginas extras são opcionais
      throw new Error(friendlyDiscoveryError(body.error, username))
    }
    const bd = body.business_discovery
    if (!profile) {
      const { media: _ignored, ...rest } = bd
      void _ignored
      profile = rest
    }
    media.push(...(bd.media?.data ?? []))
    after = bd.media?.paging?.cursors?.after
    if (!after || (bd.media?.data?.length ?? 0) < pageSize) break
  }

  return { profile: profile as PublicProfile, media: media.slice(0, maxPosts) }
}

/** Vincula um cliente a um @ (modo público). */
export async function savePublicConnection(db: SupabaseClient, clientId: string, profile: PublicProfile) {
  const now = new Date().toISOString()
  const { error } = await db.from('instagram_accounts').upsert({
    client_id: clientId,
    ig_user_id: profile.id,
    username: profile.username,
    access_token: DISCOVERY_TOKEN_MARKER,
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

/** Data de hoje no fuso de São Paulo (YYYY-MM-DD). */
export function todayBR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/** Grava (ou atualiza) o retrato diário de seguidores/posts do cliente. Falha silenciosa. */
export async function saveSnapshot(db: SupabaseClient, clientId: string, p: Pick<PublicProfile, 'followers_count' | 'follows_count' | 'media_count'>) {
  if (p.followers_count == null) return
  await db.from('instagram_daily_snapshots').upsert({
    client_id: clientId,
    snap_date: todayBR(),
    followers: p.followers_count,
    follows: p.follows_count ?? null,
    media_count: p.media_count ?? null,
  }, { onConflict: 'client_id,snap_date' })
}
