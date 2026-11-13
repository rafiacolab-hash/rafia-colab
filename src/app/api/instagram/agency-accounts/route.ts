import { NextResponse } from 'next/server'
import { getCaller, serviceClient } from '@/app/lib/server-auth'
import { listAgencyAccounts } from '@/app/lib/instagram-server'

export const dynamic = 'force-dynamic'

/** Contas do Instagram disponíveis na BM da agência (somente admin), com o cliente já vinculado a cada uma. */
export async function GET() {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

  try {
    const accounts = await listAgencyAccounts()
    const db = serviceClient()
    const { data: links } = await db.from('instagram_accounts').select('client_id, ig_user_id')
    const { data: clients } = await db.from('clients').select('id, name')
    const clientName = new Map((clients ?? []).map(c => [c.id as string, c.name as string]))
    const linkedTo = new Map<string, string>()
    for (const l of links ?? []) if (l.ig_user_id) linkedTo.set(l.ig_user_id as string, clientName.get(l.client_id as string) ?? '')

    return NextResponse.json({
      accounts: accounts.map(a => ({ ...a, linkedTo: linkedTo.get(a.id) ?? null })),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno.' }, { status: 400 })
  }
}
