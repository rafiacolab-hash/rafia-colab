import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Lê o JWT do cookie e usa o token do próprio usuário para checar o perfil
async function getCallerRole(): Promise<string | null> {
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
    const accessToken: string | undefined =
      parsed?.access_token ?? parsed?.[0]?.access_token
    if (!accessToken) return null

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const client = createAdminClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth:   { persistSession: false, autoRefreshToken: false },
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

    const { name, email, role, client_id } = await req.json()

    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, email, role.' }, { status: 400 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_ROLE_KEY)

    // 1. Cria o auth user e envia convite por e-mail
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: `${req.headers.get('origin') ?? ''}/login`,
    })
    if (inviteErr) throw new Error(inviteErr.message)

    const newUserId = inviteData.user.id

    // 2. Cria/atualiza o perfil com role e client_id
    const { error: profileErr } = await admin
      .from('users_profile')
      .upsert({
        id:        newUserId,
        name:      name.trim(),
        role,
        client_id: client_id || null,
      }, { onConflict: 'id' })

    if (profileErr) throw new Error(profileErr.message)

    return NextResponse.json({ success: true, userId: newUserId })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
