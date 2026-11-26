import { NextRequest, NextResponse } from 'next/server'
import { getCaller, serviceClient } from '@/app/lib/server-auth'

export const dynamic = 'force-dynamic'

/**
 * Exclui um cliente de vez (somente admin). Body: { clientId }
 *
 * O banco apaga em cascata tudo que pertence ao cliente: month_lists, day_entries,
 * client_access, client_brand_profile, instagram_accounts e instagram_daily_snapshots.
 * users_profile.client_id vira NULL. Os arquivos do Perfil da Marca ficam no Storage
 * (bucket brand-assets, pasta = clientId) e não entram na cascata, então são apagados aqui.
 */
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })
  }

  const { clientId } = (await req.json().catch(() => ({}))) as { clientId?: string }
  if (!clientId) {
    return NextResponse.json({ error: 'Informe clientId.' }, { status: 400 })
  }

  const supabase = serviceClient()

  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .select('id, name')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })

  // Limpa os arquivos do Perfil da Marca. Falha aqui não desfaz a exclusão.
  const { data: files } = await supabase.storage.from('brand-assets').list(clientId, { limit: 1000 })
  if (files && files.length > 0) {
    await supabase.storage.from('brand-assets').remove(files.map(f => `${clientId}/${f.name}`))
  }

  return NextResponse.json({ success: true, name: data.name })
}
