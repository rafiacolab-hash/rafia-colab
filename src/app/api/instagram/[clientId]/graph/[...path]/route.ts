import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCaller, serviceClient } from '@/app/lib/server-auth'
import { getIgAccount, graphUrl, type IgAccount } from '@/app/lib/instagram-server'

export const dynamic = 'force-dynamic'

// Proxy somente-leitura para a Instagram API. O token fica no servidor.
// Só as rotas e parâmetros usados pela aba Métricas são permitidos.
const ALLOWED_PATH = /^(me|me\/media|me\/insights|\d+\/insights)$/
const ALLOWED_PARAMS = ['fields', 'metric', 'period', 'metric_type', 'since', 'until', 'limit', 'after', 'breakdown', 'timeframe']

type Ctx = { params: { clientId: string; path: string[] } }

export async function GET(req: NextRequest, { params }: Ctx) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: { code: 'session', message: 'Não autenticado.' } }, { status: 401 })
  if (!canAccessClient(caller, params.clientId)) {
    return NextResponse.json({ error: { message: 'Sem acesso a este cliente.' } }, { status: 403 })
  }

  const apiPath = (params.path ?? []).join('/')
  if (!ALLOWED_PATH.test(apiPath)) return NextResponse.json({ error: { message: 'Rota não permitida.' } }, { status: 403 })

  let account: IgAccount | null
  try {
    account = await getIgAccount(serviceClient(), params.clientId)
  } catch (e) {
    return NextResponse.json({ error: { message: e instanceof Error ? e.message : 'Erro interno.' } }, { status: 500 })
  }
  if (!account) {
    return NextResponse.json({ error: { code: 'not_connected', message: 'Instagram não conectado para este cliente.' } }, { status: 404 })
  }
  if (account.public_mode) {
    return NextResponse.json({ error: { code: 'public_mode', message: 'Conta acompanhada só pelo @ (dados públicos).' } }, { status: 409 })
  }
  if (!account.access_token) {
    return NextResponse.json({ error: { message: 'META_AGENCY_TOKEN não configurado na Vercel.' } }, { status: 500 })
  }

  const qs = new URLSearchParams()
  for (const k of ALLOWED_PARAMS) {
    const v = req.nextUrl.searchParams.get(k)
    if (v !== null) qs.set(k, v)
  }
  qs.set('access_token', account.access_token)

  try {
    const res = await fetch(`${graphUrl(account, apiPath)}?${qs.toString()}`, { cache: 'no-store' })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: { code: 'network', message: 'Falha ao contatar a API do Instagram.' } }, { status: 502 })
  }
}
