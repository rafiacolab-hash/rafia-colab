import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/app/lib/server-auth'
import { validateToken } from '@/app/lib/instagram-server'
import { exchangeCode, publicOrigin, verifyPayload } from '@/app/lib/instagram-oauth'

export const dynamic = 'force-dynamic'

// Retorno do Instagram após o usuário autorizar. O "state" assinado diz qual cliente conectar.
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
    return done(false, sp.get('error_description') || 'A autorização foi cancelada.')
  }
  if (!state) return done(false, 'Sessão de conexão inválida ou expirada. Tente novamente.')

  const code = sp.get('code')
  if (!code) return done(false, 'O Instagram não retornou o código de autorização.')

  try {
    const { token, expiresAt } = await exchangeCode(origin, code.replace(/#_$/, ''))
    const { igUserId, username } = await validateToken(token)
    const now = new Date().toISOString()

    const { error } = await serviceClient()
      .from('instagram_accounts')
      .upsert({
        client_id: state.c,
        ig_user_id: igUserId,
        username,
        access_token: token,
        token_expires_at: expiresAt,
        last_refresh_at: now,
        last_error: null,
        connected_at: now,
        updated_at: now,
      }, { onConflict: 'client_id' })
    if (error) throw new Error(`Falha ao salvar: ${error.message}`)

    return done(true, 'Instagram conectado com sucesso.', username)
  } catch (e) {
    return done(false, e instanceof Error ? e.message : 'Erro ao concluir a conexão.')
  }
}
