import { NextRequest, NextResponse } from 'next/server'
import { getCaller } from '@/app/lib/server-auth'
import { publicOrigin, signPayload } from '@/app/lib/instagram-oauth'

export const dynamic = 'force-dynamic'

const INVITE_DAYS = 7

/** Gera um link (válido por 7 dias) para o cliente conectar o próprio Instagram sem login no sistema. */
export async function POST(req: NextRequest, { params }: { params: { clientId: string } }) {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

  try {
    const expires = Math.floor(Date.now() / 1000) + INVITE_DAYS * 86400
    const invite = signPayload({ c: params.clientId, m: 'invite', e: expires })
    const url = `${publicOrigin(req)}/api/instagram/oauth/start?invite=${encodeURIComponent(invite)}`
    return NextResponse.json({ url, expiresAt: new Date(expires * 1000).toISOString() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno.' }, { status: 500 })
  }
}
