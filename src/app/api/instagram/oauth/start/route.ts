import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/app/lib/server-auth'
import { authorizeUrl, publicOrigin, signPayload, verifyPayload } from '@/app/lib/instagram-oauth'

export const dynamic = 'force-dynamic'

// Inicia o login com Instagram.
//  - Admin logado:   /api/instagram/oauth/start?clientId=<id>
//  - Link de convite (cliente, sem login): /api/instagram/oauth/start?invite=<token assinado>
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req)
  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/instagram-conectado?status=erro&msg=${encodeURIComponent(msg)}`)

  try {
    const invite = req.nextUrl.searchParams.get('invite')
    if (invite) {
      const p = verifyPayload(invite)
      if (!p || p.m !== 'invite') return fail('Link de conexão inválido ou expirado. Peça um novo link.')
      const state = signPayload({ c: p.c, m: 'invite', e: Math.floor(Date.now() / 1000) + 3600 })
      return NextResponse.redirect(authorizeUrl(origin, state, true))
    }

    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return fail('Cliente não informado.')
    const caller = await getCaller()
    if (!caller || caller.role !== 'admin') return fail('Apenas administradores podem conectar contas.')

    const state = signPayload({ c: clientId, m: 'admin', e: Math.floor(Date.now() / 1000) + 3600 })
    // ?ig=1 → "Entrar com o Instagram da cliente": força a escolha de conta
    return NextResponse.redirect(authorizeUrl(origin, state, req.nextUrl.searchParams.get('ig') === '1'))
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erro ao iniciar a conexão.')
  }
}
