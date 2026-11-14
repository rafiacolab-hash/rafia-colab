import { NextResponse } from 'next/server'
import { canAccessClient, getCaller, serviceClient } from '@/app/lib/server-auth'
import { getIgAccount } from '@/app/lib/instagram-server'
import { fetchPublicProfile, saveSnapshot } from '@/app/lib/instagram-public'

export const dynamic = 'force-dynamic'

/**
 * Dados públicos do Instagram do cliente (modo "só pelo @"):
 * perfil, até 100 posts recentes e o histórico diário de seguidores salvo pelo sistema.
 */
export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: { code: 'session', message: 'Não autenticado.' } }, { status: 401 })
  if (!canAccessClient(caller, params.clientId)) {
    return NextResponse.json({ error: { message: 'Sem acesso a este cliente.' } }, { status: 403 })
  }

  const db = serviceClient()
  try {
    const acc = await getIgAccount(db, params.clientId)
    if (!acc?.username) {
      return NextResponse.json({ error: { code: 'not_connected', message: 'Instagram não conectado para este cliente.' } }, { status: 404 })
    }

    const { profile, media } = await fetchPublicProfile(db, acc.username, 100)
    await saveSnapshot(db, params.clientId, profile).catch(() => {})

    const { data: snapshots } = await db
      .from('instagram_daily_snapshots')
      .select('snap_date, followers, follows, media_count')
      .eq('client_id', params.clientId)
      .order('snap_date', { ascending: true })
      .limit(400)

    return NextResponse.json({ profile, media, snapshots: snapshots ?? [] })
  } catch (e) {
    return NextResponse.json({ error: { message: e instanceof Error ? e.message : 'Erro interno.' } }, { status: 400 })
  }
}
