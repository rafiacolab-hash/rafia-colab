import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ─── Supabase (service role — bypassa RLS) ────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers de data ──────────────────────────────────────────────────────────
function toYMD(d: Date) {
  return d.toISOString().split('T')[0]
}

function yesterdayRange() {
  // Usa horário de Brasília (UTC-3)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  // Pula finais de semana: se hoje é segunda, pega sexta
  if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2) // domingo → sexta
  if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1) // sábado → sexta
  const ymd = toYMD(yesterday)
  return { from: `${ymd}T00:00:00`, to: `${ymd}T23:59:59`, label: ymd }
}

function todayBR() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return toYMD(now)
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Busca atividade de ontem ─────────────────────────────────────────────────
async function fetchYesterdayActivity() {
  const { from, to, label } = yesterdayRange()
  const { data, error } = await supabase
    .from('activity_log')
    .select('client_name, action_type, user_name')
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw error
  return { rows: data ?? [], dateLabel: label }
}

// ─── Busca conteúdos atrasados (data < hoje, não postados) ───────────────────
async function fetchOverdue() {
  const today = todayBR()
  const { data, error } = await supabase
    .from('day_entries')
    .select('entry_date, client_id, stories_status, feed_status, acoes_status')
    .lt('entry_date', today)
    .or('stories_status.neq.POSTADO,feed_status.neq.POSTADO,acoes_status.neq.POSTADO')
    .not('stories_status', 'is', null)

  if (error) throw error

  // Filtra só os que têm pelo menos um campo não-postado e não-cancelado relevante
  const IGNORED = ['CANCELADO', 'POSTADO', null]
  const overdue = (data ?? []).filter(e =>
    (!IGNORED.includes(e.stories_status)) ||
    (!IGNORED.includes(e.feed_status)) ||
    (!IGNORED.includes(e.acoes_status))
  )

  // Agrupa por client_id e conta
  const byClient: Record<string, { dates: string[] }> = {}
  for (const e of overdue) {
    if (!byClient[e.client_id]) byClient[e.client_id] = { dates: [] }
    byClient[e.client_id].dates.push(e.entry_date)
  }

  // Busca nomes dos clientes
  const clientIds = Object.keys(byClient)
  if (clientIds.length === 0) return []

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .in('id', clientIds)

  const nameMap: Record<string, string> = {}
  for (const c of clients ?? []) nameMap[c.id] = c.name

  return clientIds.map(id => ({
    clientName: nameMap[id] ?? id,
    count: byClient[id].dates.length,
    oldest: byClient[id].dates.sort()[0],
  })).sort((a, b) => b.count - a.count)
}

// ─── Monta a mensagem WhatsApp ────────────────────────────────────────────────
function buildMessage(
  rows: { client_name: string; action_type: string; user_name: string }[],
  dateLabel: string,
  overdue: { clientName: string; count: number; oldest: string }[]
): string {
  const lines: string[] = []
  const [y, m, d] = dateLabel.split('-')
  lines.push(`📊 *Report Ráfia Co.lab — ${d}/${m}/${y}*`)
  lines.push('')

  // ── Atividade por cliente ──
  if (rows.length === 0) {
    lines.push('_Nenhuma atividade registrada ontem._')
  } else {
    lines.push('*Atividade de ontem por cliente:*')

    const byClient: Record<string, { status: number; content: number; users: Set<string> }> = {}
    for (const r of rows) {
      if (!byClient[r.client_name]) byClient[r.client_name] = { status: 0, content: 0, users: new Set() }
      if (r.action_type === 'status_change') byClient[r.client_name].status++
      else byClient[r.client_name].content++
      byClient[r.client_name].users.add(r.user_name)
    }

    const sorted = Object.entries(byClient).sort((a, b) => (b[1].status + b[1].content) - (a[1].status + a[1].content))
    for (const [client, data] of sorted) {
      const total = data.status + data.content
      const detail = []
      if (data.status > 0) detail.push(`${data.status} status`)
      if (data.content > 0) detail.push(`${data.content} edições`)
      lines.push(`• *${client}*: ${total} ações (${detail.join(', ')})`)
    }

    // Total geral
    const uniqueUsers = new Set(rows.map(r => r.user_name)).size
    lines.push('')
    lines.push(`Total: *${rows.length} ações* por *${uniqueUsers} assistente${uniqueUsers !== 1 ? 's' : ''}*`)
  }

  // ── Alertas de atraso ──
  if (overdue.length > 0) {
    lines.push('')
    lines.push('⚠️ *Conteúdos em atraso:*')
    for (const o of overdue) {
      lines.push(`• *${o.clientName}*: ${o.count} dia${o.count !== 1 ? 's' : ''} pendente${o.count !== 1 ? 's' : ''} (mais antigo: ${fmtDate(o.oldest)})`)
    }
  } else {
    lines.push('')
    lines.push('✅ Nenhum conteúdo em atraso.')
  }

  lines.push('')
  lines.push(`_Acesse: gestao.rafiacolab.com.br_`)

  return lines.join('\n')
}

// ─── Envia via Telegram Bot API (gratuito) ───────────────────────────────────
async function sendTelegram(message: string): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN  // Token do bot criado via @BotFather
  const chatId = process.env.ANDERSON_CHAT_ID    // Chat ID do Anderson

  if (!token || !chatId) {
    throw new Error('Variáveis TELEGRAM_BOT_TOKEN ou ANDERSON_CHAT_ID não configuradas.')
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Telegram API erro ${res.status}: ${body}`)
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Verifica CRON_SECRET (Vercel injeta automaticamente em cron jobs)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [{ rows, dateLabel }, overdue] = await Promise.all([
      fetchYesterdayActivity(),
      fetchOverdue(),
    ])

    const message = buildMessage(rows, dateLabel, overdue)
    await sendTelegram(message)

    return NextResponse.json({
      ok: true,
      date: dateLabel,
      actions: rows.length,
      overdueClients: overdue.length,
      message,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-report] erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
