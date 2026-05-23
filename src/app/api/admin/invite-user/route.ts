import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Verifica se o usuário logado é admin
async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data } = await admin
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role ?? null
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

    const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY)

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
