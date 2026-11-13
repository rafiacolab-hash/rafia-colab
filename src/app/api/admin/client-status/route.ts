import { NextRequest, NextResponse } from 'next/server'
import { getCaller, serviceClient } from '@/app/lib/server-auth'

export const dynamic = 'force-dynamic'

/** Ativa ou desativa um cliente (somente admin). Body: { clientId, active } */
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })
  }

  const { clientId, active } = (await req.json().catch(() => ({}))) as { clientId?: string; active?: boolean }
  if (!clientId || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Informe clientId e active.' }, { status: 400 })
  }

  const { data, error } = await serviceClient()
    .from('clients')
    .update({ active })
    .eq('id', clientId)
    .select('id, active')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  return NextResponse.json({ success: true, active: data.active })
}
