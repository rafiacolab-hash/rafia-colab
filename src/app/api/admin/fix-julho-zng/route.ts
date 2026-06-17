import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Busca todas as entradas de julho 2026 com status AGUARDANDO
  const { data: entries, error: eErr } = await admin
    .from('day_entries')
    .select('id, client_id, entry_date, stories_status, feed_status, acoes_status')
    .gte('entry_date', '2026-07-01')
    .lte('entry_date', '2026-07-31')

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

  const toFix = (entries ?? []).filter(e =>
    e.stories_status === 'AGUARDANDO' ||
    e.feed_status    === 'AGUARDANDO' ||
    e.acoes_status   === 'AGUARDANDO'
  )

  let fixed = 0
  const errors: string[] = []

  for (const e of toFix) {
    const update: Record<string, string> = { updated_at: new Date().toISOString() }
    if (e.stories_status === 'AGUARDANDO') update.stories_status = 'A_FAZER'
    if (e.feed_status    === 'AGUARDANDO') update.feed_status    = 'A_FAZER'
    if (e.acoes_status   === 'AGUARDANDO') update.acoes_status   = 'A_FAZER'

    const { error } = await admin.from('day_entries').update(update).eq('id', e.id)
    if (error) errors.push(`${e.entry_date}: ${error.message}`)
    else fixed++
  }

  return NextResponse.json({
    total_julho: entries?.length,
    aguardando_encontrados: toFix.length,
    corrigidas: fixed,
    errors,
  })
}
