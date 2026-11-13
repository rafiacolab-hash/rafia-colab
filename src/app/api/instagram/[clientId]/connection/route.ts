import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCaller, serviceClient } from '@/app/lib/server-auth'
import { getIgAccount, listAgencyAccounts, resolveToken, saveAgencyConnection, saveConnection } from '@/app/lib/instagram-server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { clientId: string } }

/** Status da conexão (nunca devolve o token). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  if (!canAccessClient(caller, params.clientId)) return NextResponse.json({ error: 'Sem acesso a este cliente.' }, { status: 403 })

  try {
    const acc = await getIgAccount(serviceClient(), params.clientId)
    return NextResponse.json({
      connected: !!acc,
      username: acc?.username ?? null,
      expiresAt: acc?.token_expires_at ?? null,
      viaAgency: !!acc?.via_agency,
      canManage: caller.role === 'admin',
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno.' }, { status: 500 })
  }
}

/**
 * Salva a conexão (somente admin).
 * Body: { token } para token colado manualmente, ou { agencyIgUserId } para usar uma conta da BM da agência.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

  const { token, agencyIgUserId } = (await req.json().catch(() => ({}))) as { token?: string; agencyIgUserId?: string }

  if (agencyIgUserId) {
    try {
      const acc = (await listAgencyAccounts()).find(a => a.id === String(agencyIgUserId))
      if (!acc) return NextResponse.json({ error: 'Essa conta não está acessível pela BM da agência.' }, { status: 400 })
      await saveAgencyConnection(serviceClient(), params.clientId, acc)
      return NextResponse.json({ success: true, username: acc.username })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno.' }, { status: 400 })
    }
  }

  const clean = String(token ?? '').trim()
  if (!clean) return NextResponse.json({ error: 'Cole o token de acesso.' }, { status: 400 })

  try {
    const resolved = await resolveToken(clean)
    await saveConnection(serviceClient(), params.clientId, clean, resolved)
    return NextResponse.json({ success: true, username: resolved.username })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno.' }, { status: 400 })
  }
}

/** Desconecta o Instagram do cliente (somente admin). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

  const { error } = await serviceClient().from('instagram_accounts').delete().eq('client_id', params.clientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
