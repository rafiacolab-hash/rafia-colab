import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { GRAPH_VERSION } from './instagram-server'

// Server-only: "Conectar com Instagram" via login unificado (Facebook Login para Empresas).
// O cliente pode entrar com o Instagram ou com o Facebook; o resultado é um token de
// usuário do sistema do portfólio dele, que não expira.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   META_APP_ID           ID do app (painel Meta → Configurações do app → Básico)
//   META_APP_SECRET       Chave secreta do app (mesma tela)
//   META_LOGIN_CONFIG_ID  ID da configuração (Login do Facebook para Empresas → Configurações)
//
// O redirect (https://<domínio>/api/instagram/oauth/callback) precisa estar cadastrado
// em Casos de uso → API do Instagram → API setup with Unified login → URL de redirecionamento.

export type OAuthState = {
  c: string             // client_id do sistema
  m: 'admin' | 'invite' // admin logado ou link enviado ao cliente
  e: number             // expiração (epoch s)
  n: string             // nonce
}

export function oauthConfig() {
  const appId = process.env.META_APP_ID
  const secret = process.env.META_APP_SECRET
  const configId = process.env.META_LOGIN_CONFIG_ID
  if (!appId || !secret || !configId) {
    throw new Error('META_APP_ID / META_APP_SECRET / META_LOGIN_CONFIG_ID não configurados na Vercel.')
  }
  return { appId, secret, configId }
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
  const { appId, configId } = oauthConfig()
  const qs = new URLSearchParams({
    client_id: appId,
    config_id: configId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    override_default_response_type: 'true',
    state,
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${qs.toString()}`
}

/** Troca o code pelo token (usuário do sistema do portfólio do cliente). */
export async function exchangeCode(origin: string, code: string): Promise<string> {
  const { appId, secret } = oauthConfig()
  const qs = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    redirect_uri: redirectUri(origin),
    code,
  })
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${qs.toString()}`, { cache: 'no-store' })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.access_token) {
    throw new Error(body?.error?.message || `Falha ao trocar o código (HTTP ${res.status}).`)
  }
  return String(body.access_token)
}

/** Origem pública da requisição (respeita o domínio usado: gestao.rafiacolab.com.br, preview etc.). */
export function publicOrigin(req: Request) {
  const url = new URL(req.url)
  const host = req.headers.get('x-forwarded-host') ?? url.host
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  return `${proto}://${host}`
}
