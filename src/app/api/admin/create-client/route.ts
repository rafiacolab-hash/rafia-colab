import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Lê o JWT do cookie e usa o token do próprio usuário para checar o perfil
async function getCallerRole(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const cookieName = 'sb-sbqefuorlrcaxqciylkr-auth-token'
    const rawValue =
      cookieStore.get(cookieName)?.value ??
      cookieStore.get(`${cookieName}.0`)?.value
    if (!rawValue) return null

    let tokenStr = decodeURIComponent(rawValue)
    if (tokenStr.startsWith('base64-')) {
      tokenStr = Buffer.from(tokenStr.slice(7), 'base64').toString('utf-8')
    }

    const parsed = JSON.parse(tokenStr)
    const accessToken: string | undefined =
      parsed?.access_token ?? parsed?.[0]?.access_token
    if (!accessToken) return null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const client = createAdminClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await client
      .from('users_profile')
      .select('role')
      .limit(1)
      .single()
    return data?.role ?? null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const callerRole = await getCallerRole()
    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const { name, color } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_ROLE_KEY)

    // Evita duplicar cliente com o mesmo nome
    const { data: existing } = await admin
      .from('clients')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Já existe um cliente com esse nome.' }, { status: 409 })
    }

    const { data: newClient, error } = await admin
      .from('clients')
      .insert({ name: name.trim(), color: color || '#10b981' })
      .select('id, name, color')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, client: newClient })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
