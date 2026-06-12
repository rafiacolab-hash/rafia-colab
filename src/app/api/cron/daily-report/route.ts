import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ReportType = 'morning' | 'midday' | 'check' | 'lateafternoon' | 'evening'

type DayEntry = {
  entry_date: string
  client_id: string
  stories_status: string | null
  feed_status: string | null
  acoes_status: string | null
  stories_content: string | null
  feed_content: string | null
  acoes_content: string | null
}

type ActivityLog = {
  client_name: string
  action_type: string
  user_name: string
  new_value: string | null
  field: string
}

// ─── Helpers de data (fuso Brasília) ─────────────────────────────────────────
function nowBR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}
function toYMD(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function todayBR()    { return toYMD(nowBR()) }
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`
}
function tomorrowBR() {
  const d = nowBR(); d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2) // sábado → segunda
  if (d.getDay() === 0) d.setDate(d.getDate() + 1) // domingo → segunda
  return toYMD(d)
}

// ─── Queries ──────────────────────────────────────────────────────────────────
async function fetchDayEntries(date: string): Promise<DayEntry[]> {
  const { data, error } = await supabase
    .from('day_entries')
    .select('entry_date, client_id, stories_status, feed_status, acoes_status, stories_content, feed_content, acoes_content')
    .eq('entry_date', date)
  if (error) throw error
  return (data ?? []) as DayEntry[]
}

async function fetchClientNames(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {}
  const { data } = await supabase.from('clients').select('id, name').in('id', ids)
  const map: Record<string, string> = {}
  for (const c of (data ?? [])) map[c.id] = c.name
  return map
}

async function fetchTodayActivity(): Promise<ActivityLog[]> {
  const today = todayBR()
  const { data, error } = await supabase
    .from('activity_log')
    .select('client_name, action_type, user_name, new_value, field')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ActivityLog[]
}

async function fetchOverdue() {
  const today = todayBR()
  const IGNORE = ['POSTADO', 'CANCELADO']
  const { data } = await supabase
    .from('day_entries')
    .select('entry_date, client_id, stories_status, feed_status, acoes_status')
    .lt('entry_date', today)
  const overdue = ((data ?? []) as DayEntry[]).filter(e =>
    (e.stories_status && !IGNORE.includes(e.stories_status)) ||
    (e.feed_status    && !IGNORE.includes(e.feed_status))    ||
    (e.acoes_status   && !IGNORE.includes(e.acoes_status))
  )
  const clientIds = [...new Set(overdue.map(e => e.client_id))]
  const names = await fetchClientNames(clientIds)
  const byClient: Record<string, { count: number; oldest: string }> = {}
  for (const e of overdue) {
    const n = names[e.client_id] ?? e.client_id
    if (!byClient[n]) byClient[n] = { count: 0, oldest: e.entry_date }
    byClient[n].count++
    if (e.entry_date < byClient[n].oldest) byClient[n].oldest = e.entry_date
  }
  return Object.entries(byClient).sort((a, b) => b[1].count - a[1].count)
}

// ─── Resumo de entradas ───────────────────────────────────────────────────────
function summarizeEntries(entries: DayEntry[]) {
  const byClient: Record<string, { total: number; postado: number; pendente: number }> = {}
  let total = 0, postado = 0, pendente = 0

  for (const e of entries) {
    if (!byClient[e.client_id]) byClient[e.client_id] = { total: 0, postado: 0, pendente: 0 }
    const slots: [string | null, string | null][] = [
      [e.stories_status, e.stories_content],
      [e.feed_status,    e.feed_content],
      [e.acoes_status,   e.acoes_content],
    ]
    for (const [status, content] of slots) {
      if (!content) continue
      total++; byClient[e.client_id].total++
      if (status === 'POSTADO') {
        postado++; byClient[e.client_id].postado++
      } else if (status !== 'CANCELADO') {
        pendente++; byClient[e.client_id].pendente++
      }
    }
  }
  return { total, postado, pendente, byClient }
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
async function sendTelegram(message: string) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.ANDERSON_CHAT_ID
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ou ANDERSON_CHAT_ID não configurados.')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
  })
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`)
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

async function buildMorning(): Promise<string> {
  const today = todayBR()
  const [entries, overdue] = await Promise.all([fetchDayEntries(today), fetchOverdue()])
  const clientIds = [...new Set(entries.map(e => e.client_id))]
  const names = await fetchClientNames(clientIds)
  const { total, byClient } = summarizeEntries(entries)

  const lines = [`🌅 *Bom dia\\! Planejamento de hoje — ${fmtDate(today)}*`, '']

  if (entries.length === 0) {
    lines.push('_Nenhum conteúdo planejado para hoje._')
  } else {
    lines.push(`*${total} publicações em ${clientIds.length} cliente${clientIds.length !== 1 ? 's' : ''}:*`, '')
    for (const [cid, s] of Object.entries(byClient)) {
      if (s.total === 0) continue
      lines.push(`• *${names[cid] ?? cid}*: ${s.total} publicação${s.total !== 1 ? 'ões' : ''}`)
    }
  }

  if (overdue.length > 0) {
    lines.push('', '⚠️ *Atrasos acumulados:*')
    for (const [name, d] of overdue) {
      lines.push(`• *${name}*: ${d.count} pendente${d.count !== 1 ? 's' : ''} (desde ${fmtDate(d.oldest)})`)
    }
  }

  lines.push('', '_gestao.rafiacolab.com.br_')
  return lines.join('\n')
}

async function buildProgress(label: string): Promise<string> {
  const today = todayBR()
  const [entries, activity, overdue] = await Promise.all([
    fetchDayEntries(today), fetchTodayActivity(), fetchOverdue(),
  ])
  const clientIds = [...new Set(entries.map(e => e.client_id))]
  const names = await fetchClientNames(clientIds)
  const { total, postado, pendente, byClient } = summarizeEntries(entries)

  const emoji = label === '12h' ? '☀️' : label === '14h' ? '🕒' : '🕔'
  const lines = [`${emoji} *Update ${label} — ${fmtDate(today)}*`, '']

  const pct = total > 0 ? Math.round((postado / total) * 100) : 0
  const filled = Math.round(pct / 10)
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
  lines.push(`${bar} *${pct}%* concluído`)
  lines.push(`✅ ${postado} postados  ·  🔄 ${pendente} pendentes  ·  📋 ${total} total`, '')

  for (const [cid, s] of Object.entries(byClient)) {
    if (s.total === 0) continue
    const icon = s.pendente === 0 ? '✅' : s.postado > 0 ? '🔄' : '⏳'
    lines.push(`${icon} *${names[cid] ?? cid}*: ${s.postado}/${s.total} postados`)
  }

  const statusMoves = activity.filter(a => a.action_type === 'status_change' && a.new_value === 'POSTADO').length
  if (statusMoves > 0) {
    lines.push('', `🚀 ${statusMoves} publicação${statusMoves !== 1 ? 'ões' : ''} marcada${statusMoves !== 1 ? 's' : ''} como POSTADO hoje`)
  }

  if (overdue.length > 0) {
    lines.push('', `⚠️ ${overdue.length} cliente${overdue.length !== 1 ? 's' : ''} com conteúdo atrasado`)
  }

  lines.push('', '_gestao.rafiacolab.com.br_')
  return lines.join('\n')
}

async function buildEvening(): Promise<string> {
  const today    = todayBR()
  const tomorrow = tomorrowBR()

  const [todayEntries, tomorrowEntries, activity, overdue] = await Promise.all([
    fetchDayEntries(today), fetchDayEntries(tomorrow), fetchTodayActivity(), fetchOverdue(),
  ])

  const allClientIds = [...new Set([...todayEntries, ...tomorrowEntries].map(e => e.client_id))]
  const names = await fetchClientNames(allClientIds)
  const { total, postado, pendente } = summarizeEntries(todayEntries)
  const tStats = summarizeEntries(tomorrowEntries)

  const pct = total > 0 ? Math.round((postado / total) * 100) : 0
  const lines = [`🌙 *Fechamento do dia — ${fmtDate(today)}*`, '']

  lines.push('*Resultado de hoje:*')
  lines.push(`✅ ${postado} postados · ⏳ ${pendente} pendentes · ${pct}% concluído`)

  if (activity.length > 0) {
    const users = new Set(activity.map(a => a.user_name)).size
    lines.push(`👥 ${users} assistente${users !== 1 ? 's' : ''} ativa${users !== 1 ? 's' : ''}, ${activity.length} ações registradas`)
  }

  if (pendente > 0) {
    lines.push('', `⚠️ *${pendente} publicação${pendente !== 1 ? 'ões' : ''} não postada${pendente !== 1 ? 's' : ''} hoje*`)
  }

  if (overdue.length > 0) {
    lines.push('', '🔴 *Atrasos acumulados:*')
    for (const [name, d] of overdue) {
      lines.push(`• *${name}*: ${d.count} dia${d.count !== 1 ? 's' : ''} (desde ${fmtDate(d.oldest)})`)
    }
  } else {
    lines.push('', '✨ Sem atrasos acumulados.')
  }

  if (tomorrowEntries.length > 0) {
    const tmrClientIds = [...new Set(tomorrowEntries.map(e => e.client_id))]
    lines.push('', `*Amanhã (${fmtDate(tomorrow)}):*`)
    lines.push(`📋 ${tStats.total} publicações em ${tmrClientIds.length} cliente${tmrClientIds.length !== 1 ? 's' : ''}`)
    for (const [cid, s] of Object.entries(tStats.byClient)) {
      if (s.total === 0) continue
      lines.push(`• *${names[cid] ?? cid}*: ${s.total} publicação${s.total !== 1 ? 'ões' : ''}`)
    }
  } else {
    lines.push('', `_Nenhum conteúdo planejado para amanhã (${fmtDate(tomorrow)})._`)
  }

  lines.push('', '_gestao.rafiacolab.com.br_')
  return lines.join('\n')
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') ?? 'morning') as ReportType

  try {
    let message: string
    switch (type) {
      case 'morning':       message = await buildMorning(); break
      case 'evening':       message = await buildEvening(); break
      case 'midday':        message = await buildProgress('12h'); break
      case 'check':         message = await buildProgress('14h'); break
      case 'lateafternoon': message = await buildProgress('17h'); break
      default:              message = await buildMorning()
    }
    await sendTelegram(message)
    return NextResponse.json({ ok: true, type })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-report]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
