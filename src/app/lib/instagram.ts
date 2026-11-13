// Client-side: busca métricas do Instagram via proxy /api/instagram/[clientId]/graph/*
// (o token nunca chega ao navegador).
//
// ⚠️ Armadilhas da API (testadas):
//  - reach e follower_count têm série diária nativa (metric_type=time_series)
//  - views e total_interactions NÃO têm (time_series vem vazio): pedir total_value 1 dia por vez
//  - period=day aceita no máximo ~30 dias por chamada → quebrar em janelas
//  - data: [] significa "sem dado", não zero
//  - follower_count só cobre os últimos 30 dias e exige 100+ seguidores

export const DAY = 86400

export class IgError extends Error {
  code?: string | number
  constructor(message: string, code?: string | number) {
    super(message)
    this.code = code
  }
}

export const isTokenError = (e: unknown) =>
  e instanceof IgError && (e.code === 190 || e.code === 'OAuthException')

export function friendlyError(e: unknown): string {
  if (!(e instanceof IgError)) return 'Erro ao carregar.'
  if (isTokenError(e)) return 'Token inválido ou expirado.'
  if (e.code === 'not_connected') return 'Instagram não conectado.'
  if (e.code === 'network') return 'Sem conexão com a API.'
  return e.message || 'Erro ao carregar.'
}

type GraphError = { message?: string; code?: string | number; type?: string }

export async function igApi<T = unknown>(clientId: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  let res: Response
  try {
    res = await fetch(`/api/instagram/${clientId}/graph/${path}?${qs.toString()}`, { credentials: 'same-origin' })
  } catch {
    throw new IgError('Falha de rede.', 'network')
  }
  const body = (await res.json().catch(() => null)) as ({ error?: GraphError } & T) | null
  if (!res.ok || !body || body.error) {
    const err: GraphError = body?.error ?? {}
    const code = err.code ?? (err.type === 'OAuthException' ? 'OAuthException' : res.status)
    throw new IgError(err.message || `Erro HTTP ${res.status}`, code)
  }
  return body as T
}

/** Executa tarefas com no máximo `limit` simultâneas. */
export async function pool<I, R>(items: I[], limit: number, fn: (item: I, idx: number) => Promise<R>) {
  const results: ({ ok: true; value: R } | { ok: false; error: unknown })[] = new Array(items.length)
  let i = 0
  const worker = async () => {
    while (i < items.length) {
      const idx = i++
      try { results[idx] = { ok: true, value: await fn(items[idx], idx) } }
      catch (error) { results[idx] = { ok: false, error } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/* ─── Datas ─────────────────────────────────────────────────────────────── */
export const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
export const ts = (d: Date) => Math.floor(d.getTime() / 1000)

export type Preset = 'prevMonth' | 'today' | 'week' | 'month' | '7' | '30' | '90' | 'custom'
export const PRESETS: { id: Preset; label: string; short: string }[] = [
  { id: 'prevMonth', label: 'Mês anterior', short: 'mês anterior' },
  { id: 'today', label: 'Hoje', short: 'hoje' },
  { id: 'week', label: 'Essa semana', short: 'esta semana' },
  { id: 'month', label: 'Esse mês', short: 'este mês' },
  { id: '7', label: '7 dias', short: '7 dias' },
  { id: '30', label: '30 dias', short: '30 dias' },
  { id: '90', label: '90 dias', short: '90 dias' },
]

export type Range = { since: number; until: number }

export function rangeForPreset(p: Preset): Range {
  const now = new Date()
  if (p === 'prevMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 1)
    return { since: ts(from), until: ts(to) }
  }
  let from: Date
  if (p === 'today') from = startOfDay(now)
  else if (p === 'week') { from = startOfDay(now); from.setDate(from.getDate() - ((from.getDay() + 6) % 7)) }
  else if (p === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1)
  else { from = startOfDay(now); from.setDate(from.getDate() - (Number(p) - 1)) }
  return { since: ts(from), until: ts(now) }
}

export type Day = { key: string; date: Date; since: number; until: number }

export function daysIn({ since, until }: Range): Day[] {
  const out: Day[] = []
  let d = startOfDay(new Date(since * 1000))
  while (ts(d) < until) {
    const next = new Date(d); next.setDate(next.getDate() + 1)
    out.push({ key: toKey(d), date: new Date(d), since: ts(d), until: Math.min(ts(next), until) })
    d = next
  }
  return out
}

function chunks30({ since, until }: Range): [number, number][] {
  const out: [number, number][] = []
  let s = since
  while (s < until) { const u = Math.min(s + 30 * DAY, until); out.push([s, u]); s = u }
  return out
}

/** end_time marca o FIM do dia → o dado pertence ao dia anterior. */
function endTimeToKey(endTime: string) {
  const d = new Date(Date.parse(endTime) - DAY * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

type InsightsResp = {
  data?: { name: string; values?: { value: number; end_time: string }[]; total_value?: { value: number } }[]
}

export type SeriesResult = { map: Map<string, number>; failed: number; lastError: unknown }

/** Série diária nativa (reach, follower_count) em janelas de 30 dias. */
export async function timeSeries(clientId: string, metric: string, range: Range): Promise<SeriesResult> {
  const map = new Map<string, number>()
  let failed = 0
  let lastError: unknown = null
  const parts = await pool(chunks30(range), 3, ([s, u]) =>
    igApi<InsightsResp>(clientId, 'me/insights', { metric, period: 'day', metric_type: 'time_series', since: s, until: u }))
  for (const p of parts) {
    if (!p.ok) { failed++; lastError = p.error; continue }
    const m = (p.value.data ?? []).find(x => x.name === metric)
    for (const v of m?.values ?? []) map.set(endTimeToKey(v.end_time), Number(v.value) || 0)
  }
  return { map, failed, lastError }
}

/** total_value de uma ou mais métricas para um intervalo. */
export async function totalValue(clientId: string, metrics: string, range: Range) {
  const r = await igApi<InsightsResp>(clientId, 'me/insights', {
    metric: metrics, period: 'day', metric_type: 'total_value', since: range.since, until: range.until,
  })
  const out: Record<string, number | null> = {}
  for (const m of r.data ?? []) out[m.name] = m.total_value ? Number(m.total_value.value) : null
  return out
}

/* ─── Formatação ────────────────────────────────────────────────────────── */
const nfCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const nfFull = new Intl.NumberFormat('pt-BR')
const nfPct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const fmt = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '—' : Math.abs(n) >= 10000 ? nfCompact.format(n) : nfFull.format(Math.round(n))
export const fmtPct = (n: number | null | undefined) => (n == null || isNaN(n) ? '—' : `${nfPct.format(n)}%`)
export const fmtDayShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
export const fmtDayLong = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
