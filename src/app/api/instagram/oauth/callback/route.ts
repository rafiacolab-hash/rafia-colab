import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/app/lib/server-auth'
import { resolveToken, saveConnection } from '@/app/lib/instagram-server'
import { exchangeCode, publicOrigin, verifyPayload } from '@/app/lib/instagram-oauth'

export const dynamic = 'force-dynamic'

// Retorno do login (Facebook/Instagram) após o usuário autorizar.
// O "state" assinado diz qual cliente do sistema conectar.
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req)
  const sp = req.nextUrl.searchParams
  const state = (() => { try { return verifyPayload(sp.get('state')) } catch { return null } })()

  const done = (ok: boolean, msg: string, username?: string) => {
    if (state?.m === 'admin' && ok) {
      return NextResponse.redirect(`${origin}/${state.c}/metricas?ig=ok`)
    }
    const qs = new URLSearchParams({ status: ok ? 'ok' : 'erro', msg })
    if (username) qs.set('u', username)
    return NextResponse.redirect(`${origin}/instagram-conectado?${qs.toString()}`)
  }

  if (sp.get('error')) {
    return done(false, sp.get('error_description') || sp.get('error_reason') || 'A autorização foi cancelada.')
  }
  if (!state) return done(false, 'Sessão de conexão inválida ou expirada. Tente novamente.')

  const code = sp.get('code')
  if (!code) return done(false, 'Não foi recebido o código de autorização.')

  try {
    const token = await exchangeCode(origin, code)
    const resolved = await resolveToken(token)
    await saveConnection(serviceClient(), state.c, token, resolved)
    return done(true, 'Instagram conectado com sucesso.', resolved.username)
  } catch (e) {
    return done(false, e instanceof Error ? e.message : 'Erro ao concluir a conexão.')
  }
}
