import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Lê o JWT do cookie (mesmo padrão do import-csv)
async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const cookieName  = 'sb-sbqefuorlrcaxqciylkr-auth-token'

    const rawValue =
      cookieStore.get(cookieName)?.value ??
      cookieStore.get(`${cookieName}.0`)?.value

    if (!rawValue) return null

    let tokenStr = decodeURIComponent(rawValue)
    if (tokenStr.startsWith('base64-')) {
      tokenStr = Buffer.from(tokenStr.slice(7), 'base64').toString('utf-8')
    }

    const parsed = JSON.parse(tokenStr)
    return parsed?.access_token ?? parsed?.[0]?.access_token ?? null
  } catch { return null }
}

export async function GET() {
  // Tenta service_role primeiro; se não funcionar, usa JWT do usuário logado
  let supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Verifica se o service_role funciona com uma query simples
  const { error: testError } = await supabase.from('day_entries').select('id').limit(1)

  if (testError) {
    // Fallback: usa JWT do cookie do usuário logado
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return NextResponse.json({ error: 'Não autenticado. Faça login primeiro.' }, { status: 401 })
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  // Busca todas as entradas de julho 2026 com status AGUARDANDO
  const { data: entries, error: eErr } = await supabase
    .from('day_entries')
    .select('id, client_id, entry_date, stories_status, feed_status, acoes_status')
    .gte('entry_date', '2026-07-01')
    .lte('entry_date', '2026-07-31')

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

  const toFix = (entries ?? []).filter((e: { stories_status: string; feed_status: string; acoes_status: string }) =>
    e.stories_status === 'AGUARDANDO' ||
    e.feed_status    === 'AGUARDANDO' ||
    e.acoes_status   === 'AGUARDANDO'
  )

  let fixed = 0
  const errors: string[] = []

  for (const e of toFix as Array<{ id: string; entry_date: string; stories_status: string; feed_status: string; acoes_status: string }>) {
    const update: Record<string, string> = { updated_at: new Date().toISOString() }
    if (e.stories_status === 'AGUARDANDO') update.stories_status = 'A_FAZER'
    if (e.feed_status    === 'AGUARDANDO') update.feed_status    = 'A_FAZER'
    if (e.acoes_status   === 'AGUARDANDO') update.acoes_status   = 'A_FAZER'

    const { error } = await supabase.from('day_entries').update(update).eq('id', e.id)
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
