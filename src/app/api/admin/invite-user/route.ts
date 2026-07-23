import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const COOKIE_NAME = 'sb-sbqefuorlrcaxqciylkr-auth-token'

function parseAccessTokenFromRaw(raw: string): string | null {
  try {
    let value = raw
    if (value.startsWith('base64-')) {
      value = Buffer.from(value.slice(7), 'base64').toString('utf-8')
    }
    const parsed = JSON.parse(value)
    return parsed?.access_token ?? parsed?.[0]?.access_token ?? null
  } catch {
    return null
  }
}

// Lê o token de acesso do cookie do Supabase — reconstrói os chunks
// (sb-xxx-auth-token.0, .1, .2, ...) quando o JWT é grande e o SSR
// helper divide o cookie em várias partes.
async function getAccessTokenFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies()

  const direct = cookieStore.get(COOKIE_NAME)?.value
  if (direct) {
    const token = parseAccessTokenFromRaw(decodeURIComponent(direct))
    if (token) return token
  }

  const chunks: string[] = []
  for (let i = 0; ; i++) {
    const chunk = cookieStore.get(`${COOKIE_NAME}.${i}`)?.value
    if (chunk === undefined) break
    chunks.push(decodeURIComponent(chunk))
  }
  if (chunks.length > 0) {
    return parseAccessTokenFromRaw(chunks.join(''))
  }

  return null
}

// Lê o JWT do cookie e usa o token do próprio usuário para checar o perfil.
// Retorna também um "reason" quando falha, pra dar pra diagnosticar em produção
// sem precisar acessar os logs do Vercel.
async function getCallerInfo(): Promise<{ role: string | null; reason?: string }> {
  try {
    const accessToken = await getAccessTokenFromServerCookies()
    if (!accessToken) return { role: null, reason: 'cookie de sessão não encontrado' }

    let userId: string | undefined
    try {
      const jwtPayload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString('utf-8'))
      userId = jwtPayload?.sub
    } catch {
      return { role: null, reason: 'não foi possível decodificar o token de sessão' }
    }
    if (!userId) return { role: null, reason: 'token de sessão sem id de usuário' }

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const client = createAdminClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth:   { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client
      .from('users_profile')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (error) return { role: null, reason: `erro ao buscar perfil: ${error.message}` }
    if (!data) return { role: null, reason: 'perfil não encontrado em users_profile' }
    return { role: data.role ?? null }
  } catch (e) {
    return { role: null, reason: e instanceof Error ? e.message : 'erro desconhecido' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role: callerRole, reason } = await getCallerInfo()
    if (callerRole !== 'admin') {
      return NextResponse.json(
        { error: `Acesso negado (${reason ?? `role atual: ${callerRole ?? 'nenhum'}`}).` },
        { status: 403 }
      )
    }

    const { name, email, role, client_id } = await req.json()

    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, email, role.' }, { status: 400 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_ROLE_KEY)

    let userId: string = ''
    let isExisting = false

    // 1. Busca o usuário pelo e-mail direto na API REST do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const searchResp = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
    )

    console.log('[invite-user] searchResp.ok:', searchResp.ok, 'status:', searchResp.status)

    if (searchResp.ok) {
      const searchData = await searchResp.json()
      const allUsers = searchData?.users ?? searchData ?? []
      console.log('[invite-user] total users found:', Array.isArray(allUsers) ? allUsers.length : 'not array', 'keys:', Object.keys(searchData ?? {}))

      const found = (Array.isArray(allUsers) ? allUsers : []).find(
        (u: { email?: string; id: string }) =>
          u.email?.toLowerCase() === email.trim().toLowerCase()
      )
      console.log('[invite-user] user found by email:', !!found, found?.id)

      if (found) {
        userId = found.id
        isExisting = true
      }
    } else {
      const errText = await searchResp.text()
      console.log('[invite-user] search failed:', errText)
    }

    if (!isExisting) {
      // 2. Usuário não existe — envia convite por e-mail
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { name },
        redirectTo: `${req.headers.get('origin') ?? ''}/login`,
      })
      console.log('[invite-user] invite result — err:', inviteErr?.message, 'userId:', inviteData?.user?.id)
      if (inviteErr) throw new Error(inviteErr.message)
      userId = inviteData.user.id
    }

    // 2. Cria/atualiza o perfil com role e client_id
    const { error: profileErr } = await admin
      .from('users_profile')
      .upsert({
        id:        userId,
        name:      name.trim(),
        role,
        client_id: client_id || null,
      }, { onConflict: 'id' })

    if (profileErr) throw new Error(profileErr.message)

    return NextResponse.json({ success: true, userId, existing: isExisting })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
