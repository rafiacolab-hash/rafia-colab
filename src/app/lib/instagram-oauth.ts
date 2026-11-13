import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Server-only: fluxo OAuth "Login com Instagram" (Instagram API with Instagram Login).
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   INSTAGRAM_APP_ID      ID do app do Instagram (painel Meta → Instagram → Configuração da API com login do Instagram)
//   INSTAGRAM_APP_SECRET  Chave secreta do app do Instagram (mesma tela)
//
// O redirect URI (https://<domínio>/api/instagram/oauth/callback) precisa estar
// cadastrado em "Configurar login empresarial do Instagram → URIs de redirecionamento OAuth".

export const IG_SCOPES = 'instagram_business_basic,instagram_business_manage_insights'

export type OAuthState = {
  c: string            // client_id do sistema
  m: 'admin' | 'invite' // admin logado ou link enviado ao cliente
  e: number            // expiração (epoch s)
  n: string            // nonce
}

export function oauthConfig() {
  const appId = process.env.INSTAGRAM_APP_ID
  const secret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !secret) {
    throw new Error('INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET não configurados na Vercel.')
  }
  return { appId, secret }
}

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

/** Assina um payload (HMAC-SHA256 com o App Secret). Usado no state e nos links de convite. */
export function signPayload(payload: Omit<OAuthState, 'n'> & { n?: string }): string {
  const { secret } = oauthConfig()
  const full: OAuthState = { ...payload, n: payload.n ?? b64url(randomBytes(9)) }
  const body = b64url(Buffer.from(JSON.stringify(full)))
  const sig = b64url(createHmac('sha256', secret).update(body).digest())
  return `${body}.${sig}`
}

/** Valida assinatura e expiração. Retorna null se inválido. */
export function verifyPayload(token: string | null | undefined): OAuthState | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const { secret } = oauthConfig()
  const expected = createHmac('sha256', secret).update(body).digest()
  const given = fromB64url(sig)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const p = JSON.parse(fromB64url(body).toString('utf-8')) as OAuthState
    if (!p?.c || !p.e || p.e < Date.now() / 1000) return null
    return p
  } catch {
    return null
  }
}

export function redirectUri(origin: string) {
  return `${origin}/api/instagram/oauth/callback`
}

export function authorizeUrl(origin: string, state: string) {
  const { appId } = oauthConfig()
  const qs = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: IG_SCOPES,
    state,
  })
  return `https://www.instagram.com/oauth/authorize?${qs.toString()}`
}

/** Troca o code por token curto e depois por token de longa duração (~60 dias). */
export async function exchangeCode(origin: string, code: string): Promise<{ token: string; expiresAt: string }> {
  const { appId, secret } = oauthConfig()

  const form = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(origin),
    code,
  })
  const res = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form, cache: 'no-store' })
  const body = await res.json().catch(() => null)
  const short = body?.access_token ?? body?.data?.[0]?.access_token
  if (!res.ok || !short) {
    throw new Error(body?.error_message || body?.error?.message || `Falha ao trocar o código (HTTP ${res.status}).`)
  }

  const qs = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: secret, access_token: String(short) })
  const res2 = await fetch(`https://graph.instagram.com/access_token?${qs.toString()}`, { cache: 'no-store' })
  const body2 = await res2.json().catch(() => null)
  if (!res2.ok || !body2?.access_token) {
    throw new Error(body2?.error?.message || `Falha ao gerar token de longa duração (HTTP ${res2.status}).`)
  }
  const ttl = Number(body2.expires_in) || 60 * 24 * 3600
  return { token: String(body2.access_token), expiresAt: new Date(Date.now() + ttl * 1000).toISOString() }
}

/** Origem pública da requisição (respeita o domínio usado: gestao.rafiacolab.com.br, preview etc.). */
export function publicOrigin(req: Request) {
  const url = new URL(req.url)
  const host = req.headers.get('x-forwarded-host') ?? url.host
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  return `${proto}://${host}`
}
