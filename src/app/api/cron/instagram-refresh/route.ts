import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/app/lib/server-auth'
import { refreshToken } from '@/app/lib/instagram-server'

export const dynamic = 'force-dynamic'

// Vercel Cron diário: renova os tokens do Instagram que vencem nos próximos 30 dias.
// Se CRON_SECRET estiver configurado no Vercel, exige o header enviado pelo cron.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const db = serviceClient()
  const limit = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  const { data, error } = await db
    .from('instagram_accounts')
    .select('client_id, access_token, token_expires_at')
    .eq('api_host', 'instagram') // tokens do login unificado não expiram
    .or(`token_expires_at.is.null,token_expires_at.lt.${limit}`)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { clientId: string; ok: boolean }[] = []
  for (const acc of data ?? []) {
    const now = new Date().toISOString()
    const refreshed = await refreshToken(acc.access_token as string)
    if (refreshed) {
      await db.from('instagram_accounts').update({
        access_token: refreshed.token,
        token_expires_at: refreshed.expiresAt,
        last_refresh_at: now,
        last_error: null,
        updated_at: now,
      }).eq('client_id', acc.client_id)
    } else {
      await db.from('instagram_accounts').update({
        last_error: 'Falha ao renovar o token (pode ter expirado ou ter menos de 24h).',
        updated_at: now,
      }).eq('client_id', acc.client_id)
    }
    results.push({ clientId: acc.client_id as string, ok: !!refreshed })
  }

  return NextResponse.json({ checked: results.length, results })
}
