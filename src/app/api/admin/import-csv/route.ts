import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ─── Mapeamento de status ─────────────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  'postado':      'POSTADO',
  'agendado':     'POSTADO',
  'aprovado':     'VALIDACAO',
  'aguardando':   'AGUARDANDO',
  'a fazer':      'A_FAZER',
  'andamento':    'ANDAMENTO',
  'em andamento': 'ANDAMENTO',
  'correcao':     'CORRECAO',
  'correção':     'CORRECAO',
  'cancelado':    'CANCELADO',
}

function mapStatus(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  return STATUS_MAP[raw.trim().toLowerCase()] ?? null
}

// ─── Parser de CSV ────────────────────────────────────────────────────────────
function parseLine(line: string): string[] {
  const result: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(field.trim())
      field = ''
    } else {
      field += ch
    }
  }
  result.push(field.trim())
  return result
}

function parseCSV(filepath: string): Record<string, string>[] {
  const content = readFileSync(filepath, 'utf-8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^﻿/, '')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

// ─── Conversão de data DD/MM/YYYY → YYYY-MM-DD ────────────────────────────────
function parseDate(raw: string): string | null {
  const p = raw?.trim().split('/')
  if (p?.length !== 3) return null
  return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
}

// ─── Dia da semana ────────────────────────────────────────────────────────────
const SEMANA: Record<string, string> = {
  'domingo': 'Dom', 'segunda-feira': 'Seg', 'segunda': 'Seg',
  'terça-feira': 'Ter', 'terca-feira': 'Ter', 'terça': 'Ter',
  'quarta-feira': 'Qua', 'quarta': 'Qua',
  'quinta-feira': 'Qui', 'quinta': 'Qui',
  'sexta-feira': 'Sex', 'sexta': 'Sex',
  'sábado': 'Sáb', 'sabado': 'Sáb',
}
function mapSemana(raw: string): string {
  return SEMANA[raw?.trim().toLowerCase()] ?? raw?.trim().slice(0, 3) ?? ''
}

// ─── Processa CSV em rows do banco ────────────────────────────────────────────
type CsvEntry = {
  entry_date: string
  dia_semana: string
  stories_content: string | null
  stories_status: string | null
  stories_format: string | null
  feed_content: string | null
  feed_status: string | null
  feed_format: string | null
  acoes_content: string | null
  acoes_status: string | null
  acoes_format: null
  legenda_copy: string | null
  arte_link: string | null
  observacoes: string | null
}

function processCSV(filepath: string, isZNG: boolean): CsvEntry[] {
  const rows = parseCSV(filepath)
  const entries: CsvEntry[] = []

  for (const row of rows) {
    const entry_date = parseDate(row['Dia'])
    if (!entry_date) continue

    let stories_content: string | null = row['Stories']?.trim() || null
    let feed_content: string | null    = row['Feed']?.trim()    || null
    let acoes_content: string | null   = null
    let stories_status: string | null  = null
    let feed_status: string | null     = null
    let acoes_status: string | null    = null

    if (isZNG) {
      // Formato especial ZNG Março: coluna "Stories Ação" + status separados por formato
      const storiesAcao = row['Stories Ação ']?.trim() || row['Stories Ação']?.trim() || ''
      if (storiesAcao) {
        stories_content = [stories_content, storiesAcao].filter(Boolean).join('\n') || null
      }
      acoes_content  = row['Ações ']?.trim() || row['Ações']?.trim() || null
      stories_status = mapStatus(row['Status Story'])
      feed_status    = mapStatus(row['Status Feed'])
      acoes_status   = stories_status ?? feed_status
    } else {
      // Formato padrão: coluna "Status" única aplicada a todos os formatos
      const status = mapStatus(row['Status'])
      stories_status = status
      feed_status    = status
      acoes_status   = status
    }

    // Coluna "Ações" presente em planilhas novas (Mari Telli, ZNG Maio/Junho)
    if (!acoes_content) {
      acoes_content = row['Ações']?.trim() || row['Ações ']?.trim() || null
    }

    // Formato do Feed — "Formato Feed" (Mari Telli Maio) ou "Formato" (Mari Telli Junho)
    const feed_format =
      row['Formato Feed']?.trim() ||
      row['Formato ']?.trim()     ||
      row['Formato']?.trim()      ||
      null

    entries.push({
      entry_date,
      dia_semana:     mapSemana(row['Semana']),
      stories_content,
      stories_status,
      stories_format: null,
      feed_content,
      feed_status,
      feed_format,
      acoes_content,
      acoes_status,
      acoes_format: null,
      legenda_copy: row['Legenda']?.trim()      || null,
      arte_link:    row['Arte/Link']?.trim()    || null,
      observacoes:  row['Observações']?.trim()  || null,
    })
  }

  return entries
}

// ─── Verifica se o caller é admin ─────────────────────────────────────────────
// Lê o JWT do cookie e usa o token do próprio usuário para checar o perfil
// (igual ao createDataClient() no client-side — não depende da SERVICE_ROLE_KEY)
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const cookieName  = 'sb-sbqefuorlrcaxqciylkr-auth-token'

    const rawValue =
      cookieStore.get(cookieName)?.value ??
      cookieStore.get(`${cookieName}.0`)?.value

    if (!rawValue) return false

    let tokenStr = decodeURIComponent(rawValue)
    if (tokenStr.startsWith('base64-')) {
      tokenStr = Buffer.from(tokenStr.slice(7), 'base64').toString('utf-8')
    }

    const parsed = JSON.parse(tokenStr)
    const accessToken: string | undefined =
      parsed?.access_token ?? parsed?.[0]?.access_token

    if (!accessToken) return false

    // Usa o token do próprio usuário (RLS permite ler o próprio perfil)
    const client = createAdminClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth:   { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await client
      .from('users_profile')
      .select('role')
      .limit(1)
      .single()

    return data?.role === 'admin'
  } catch { return false }
}

// ─── GET: verifica status dos arquivos e clientes ─────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const DATA_DIR = join(process.cwd(), 'scripts', 'data')
  const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: clients } = await admin.from('clients').select('id, name')
  const { data: months }  = await admin.from('month_lists').select('client_id, month_ref')

  const FILES = getFilesConfig(DATA_DIR)
  const status = FILES.map(f => {
    const exists = existsSync(f.filepath)
    const client = clients?.find(c => c.name.toLowerCase() === f.clientName.toLowerCase())
    const hasMonth = client
      ? months?.some(m => m.client_id === client.id && m.month_ref === f.monthRef)
      : false
    return {
      label: f.label,
      fileExists: exists,
      clientFound: !!client,
      clientId: client?.id ?? null,
      monthRef: f.monthRef,
      alreadyImported: hasMonth,
    }
  })

  return NextResponse.json({ status })
}

// ─── POST: executa a importação ───────────────────────────────────────────────
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const DATA_DIR = join(process.cwd(), 'scripts', 'data')
  const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4']
  let colorIdx = 0

  const FILES = getFilesConfig(DATA_DIR)
  const results: { label: string; ok: boolean; inserted?: number; message?: string }[] = []

  for (const f of FILES) {
    try {
      if (!existsSync(f.filepath)) {
        results.push({ label: f.label, ok: false, message: 'Arquivo não encontrado' })
        continue
      }

      const entries = processCSV(f.filepath, f.isZNG)
      if (entries.length === 0) {
        results.push({ label: f.label, ok: false, message: 'Nenhuma linha válida' })
        continue
      }

      // Busca ou cria cliente
      const { data: clientsData } = await admin.from('clients').select('id, name')
      let client = clientsData?.find(c => c.name.toLowerCase().trim() === f.clientName.toLowerCase().trim())
      let clientId: string

      if (client) {
        clientId = client.id
      } else {
        const color = COLORS[colorIdx++ % COLORS.length]
        const { data: newClient, error: cErr } = await admin
          .from('clients').insert({ name: f.clientName, color }).select('id').single()
        if (cErr) throw new Error(`Erro ao criar cliente: ${cErr.message}`)
        clientId = newClient.id
      }

      // Busca ou cria month_list
      const { data: existingMonth } = await admin
        .from('month_lists').select('id')
        .eq('client_id', clientId).eq('month_ref', f.monthRef).single()

      let monthListId: string
      if (existingMonth) {
        monthListId = existingMonth.id
      } else {
        const year = parseInt(f.monthRef.split('-')[0])
        const { data: newMonth, error: mErr } = await admin
          .from('month_lists').insert({ client_id: clientId, month_ref: f.monthRef, year })
          .select('id').single()
        if (mErr) throw new Error(`Erro ao criar month_list: ${mErr.message}`)
        monthListId = newMonth.id
      }

      // Upsert em lotes
      const rows = entries.map(e => ({
        ...e,
        month_list_id: monthListId,
        client_id: clientId,
        updated_at: new Date().toISOString(),
      }))

      const BATCH = 50
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await admin
          .from('day_entries')
          .upsert(rows.slice(i, i + BATCH), { onConflict: 'month_list_id,entry_date' })
        if (error) throw new Error(`Erro no upsert: ${error.message}`)
      }

      results.push({ label: f.label, ok: true, inserted: rows.length })
    } catch (err: unknown) {
      results.push({ label: f.label, ok: false, message: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ results })
}

// ─── Configuração dos arquivos ────────────────────────────────────────────────
function getFilesConfig(dataDir: string) {
  return [
    { label: 'Perfect Glam — Jan 2026',   filepath: join(dataDir, 'Perfect Glam - Janeiro.csv'), clientName: 'Perfect Glam',   monthRef: '2026-01', isZNG: false },
    { label: 'Ráfia Co.lab — Mar 2026',   filepath: join(dataDir, 'Rafia CoLab - Marco.csv'),    clientName: 'Ráfia Co.lab',   monthRef: '2026-03', isZNG: false },
    { label: 'Maithë Shoes — Mar 2026',   filepath: join(dataDir, 'Maithe Shoes - Marco.csv'),   clientName: 'Maithë Shoes',   monthRef: '2026-03', isZNG: false },
    { label: 'Mari Telli — Mar 2026',     filepath: join(dataDir, 'Mari Telli - Marco.csv'),     clientName: 'Mari Telli',     monthRef: '2026-03', isZNG: false },
    { label: 'ZNG — Mar 2026',            filepath: join(dataDir, 'ZNG - Marco.csv'),            clientName: 'ZNG',            monthRef: '2026-03', isZNG: true  },
    // Novas planilhas (xlsx convertidos para CSV)
    { label: 'Mari Telli — Mai 2026',     filepath: join(dataDir, 'Mari Telli - Maio.csv'),      clientName: 'Mari Telli',     monthRef: '2026-05', isZNG: false },
    { label: 'Mari Telli — Jun 2026',     filepath: join(dataDir, 'Mari Telli - Junho.csv'),     clientName: 'Mari Telli',     monthRef: '2026-06', isZNG: false },
    { label: 'ZNG — Mai 2026',            filepath: join(dataDir, 'ZNG - Maio.csv'),             clientName: 'ZNG',            monthRef: '2026-05', isZNG: false },
    { label: 'ZNG — Jun 2026',            filepath: join(dataDir, 'ZNG - Junho.csv'),            clientName: 'ZNG',            monthRef: '2026-06', isZNG: false },
  ]
}
