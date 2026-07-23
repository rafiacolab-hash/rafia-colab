import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const COOKIE_NAME = 'sb-sbqefuorlrcaxqciylkr-auth-token'

// Decodifica o claim "role" de uma service_role key (é um JWT igual ao anon key,
// só muda o payload). Serve pra confirmar em runtime que a env var configurada
// no Vercel é mesmo a service_role e não, por exemplo, a anon key colada errada.
function decodeKeyRole(key: string | undefined): string | null {
  if (!key) return null
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf-8'))
    return payload?.role ?? null
  } catch {
    return null
  }
}

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const client = createAdminClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
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

    const { name, color } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 })
    }

    const keyRole = decodeKeyRole(SERVICE_ROLE_KEY)
    if (keyRole !== 'service_role') {
      return NextResponse.json(
        {
          error: `SUPABASE_SERVICE_ROLE_KEY mal configurada no Vercel (a chave detectada tem role "${keyRole ?? 'não decodificável'}", deveria ser "service_role"). Confira em Vercel → Settings → Environment Variables se o valor colado é a "service_role secret" do Supabase (Project Settings → API), não a "anon public" key.`,
        },
        { status: 500 }
      )
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_ROLE_KEY)

    // Evita duplicar cliente com o mesmo nome
    const { data: existing, error: existingErr } = await admin
      .from('clients')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle()

    if (existingErr) throw new Error(`Falha ao verificar duplicidade: ${existingErr.message}`)

    if (existing) {
      return NextResponse.json({ error: 'Já existe um cliente com esse nome.' }, { status: 409 })
    }

    const { data: newClient, error } = await admin
      .from('clients')
      .insert({ name: name.trim(), color: color || '#10b981' })
      .select('id, name, color')
      .single()

    if (error) throw new Error(`Falha ao inserir cliente (chave role="${keyRole}"): ${error.message}`)

    return NextResponse.json({ success: true, client: newClient })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
