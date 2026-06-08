'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, ArrowRight, ArrowLeft, TrendingUp, Layers, Users, Calendar } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────
type LogRow = {
  id: string
  user_id: string
  user_name: string
  action_type: 'status_change' | 'content_edit'
  entry_id: string
  client_id: string
  client_name: string
  entry_date: string
  field: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

type DateRange = '7d' | '30d' | 'mes' | 'custom'

// ─── Status label map ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  A_FAZER:    'A Fazer',
  ANDAMENTO:  'Em Andamento',
  AGUARDANDO: 'Ag. Aprovação',
  CORRECAO:   'Em Correção',
  AGENDADO:   'Agendado',
  CONCLUIDO:  'Concluído',
  POSTADO:    'Postado',
  CANCELADO:  'Cancelado',
}

const STATUS_DOT: Record<string, string> = {
  A_FAZER:    'bg-zinc-400',
  ANDAMENTO:  'bg-blue-400',
  AGUARDANDO: 'bg-amber-400',
  CORRECAO:   'bg-red-400',
  AGENDADO:   'bg-sky-400',
  CONCLUIDO:  'bg-violet-400',
  POSTADO:    'bg-emerald-400',
  CANCELADO:  'bg-zinc-300',
}

function statusLabel(v: string | null): string {
  if (!v) return '—'
  return STATUS_LABEL[v] ?? v
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return d.toISOString().split('T')[0]
}

function rangeStart(range: DateRange, customFrom: string): string {
  const now = new Date()
  if (range === '7d')    { const d = new Date(now); d.setDate(d.getDate() - 6);  return toYMD(d) }
  if (range === '30d')   { const d = new Date(now); d.setDate(d.getDate() - 29); return toYMD(d) }
  if (range === 'mes')   { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01` }
  return customFrom
}

function rangeEnd(range: DateRange, customTo: string): string {
  if (range === 'custom') return customTo
  return toYMD(new Date())
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  const cur = new Date(from + 'T12:00:00')
  const end = new Date(to   + 'T12:00:00')
  while (cur <= end) {
    days.push(toYMD(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBar({ data, color = '#10b981' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-[3px] h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${Math.max((d.value / max) * 52, d.value > 0 ? 4 : 0)}px`, backgroundColor: color }}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-theme-card border border-theme-border rounded px-1.5 py-0.5 text-[10px] text-theme-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg">
            {d.label}: {d.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── User summary card ────────────────────────────────────────────────────────
function UserCard({
  userName, logs, days,
}: {
  userName: string
  logs: LogRow[]
  days: string[]
}) {
  const statusChanges = logs.filter(l => l.action_type === 'status_change').length
  const contentEdits  = logs.filter(l => l.action_type === 'content_edit').length
  const total         = logs.length

  const clientCounts: Record<string, number> = {}
  for (const l of logs) {
    clientCounts[l.client_name || l.client_id] = (clientCounts[l.client_name || l.client_id] || 0) + 1
  }
  const topClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]

  const perDay = days.map(d => ({
    label: fmtDate(d),
    value: logs.filter(l => l.created_at.startsWith(d)).length,
  }))

  const initials = userName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-theme-card border border-theme-border rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-theme-primary font-semibold text-sm truncate">{userName}</p>
          <p className="text-theme-muted text-xs">{total} ações no período</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-theme-primary">{total}</p>
          <p className="text-[10px] text-theme-muted">total</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-theme-surface rounded-xl p-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-theme-muted leading-none mb-0.5">Status</p>
            <p className="text-lg font-bold text-theme-primary leading-none">{statusChanges}</p>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl p-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-theme-muted leading-none mb-0.5">Edições</p>
            <p className="text-lg font-bold text-theme-primary leading-none">{contentEdits}</p>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div>
        <p className="text-[10px] text-theme-muted mb-1.5 uppercase tracking-wider">Atividade por dia</p>
        <MiniBar data={perDay} />
      </div>

      {/* Top client */}
      {topClient && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-theme-muted">Cliente mais ativo</span>
          <span className="text-theme-secondary font-medium truncate max-w-[120px]">{topClient[0]}</span>
        </div>
      )}
    </div>
  )
}

// ─── Status transition table ──────────────────────────────────────────────────
function TransitionTable({ logs, selectedUser }: { logs: LogRow[]; selectedUser: string }) {
  const statusLogs = logs.filter(l =>
    l.action_type === 'status_change' &&
    l.old_value && l.new_value &&
    l.old_value !== l.new_value &&
    (selectedUser === 'all' || l.user_name === selectedUser)
  )

  const transitions: Record<string, number> = {}
  for (const l of statusLogs) {
    const key = `${l.old_value}→${l.new_value}`
    transitions[key] = (transitions[key] || 0) + 1
  }

  const sorted = Object.entries(transitions).sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) {
    return <p className="text-sm text-theme-muted text-center py-6">Nenhuma transição de status no período.</p>
  }

  const maxCount = sorted[0][1]

  return (
    <div className="space-y-2">
      {sorted.slice(0, 15).map(([key, count]) => {
        const [from, to] = key.split('→')
        const pct = Math.round((count / maxCount) * 100)
        return (
          <div key={key} className="flex items-center gap-3">
            {/* From */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[from] ?? 'bg-theme-border'}`} />
              <span className="text-xs text-theme-secondary truncate">{statusLabel(from)}</span>
            </div>
            <ArrowRight size={12} className="text-theme-muted flex-shrink-0" />
            {/* To */}
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[to] ?? 'bg-theme-border'}`} />
              <span className="text-xs text-theme-secondary truncate">{statusLabel(to)}</span>
            </div>
            {/* Bar */}
            <div className="flex-1 h-1.5 bg-theme-surface rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-mono text-theme-muted w-6 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activity feed ────────────────────────────────────────────────────────────
function ActivityFeed({ logs, selectedUser }: { logs: LogRow[]; selectedUser: string }) {
  const filtered = logs
    .filter(l => selectedUser === 'all' || l.user_name === selectedUser)
    .slice(0, 50)

  if (filtered.length === 0) {
    return <p className="text-sm text-theme-muted text-center py-6">Nenhuma atividade no período.</p>
  }

  const fieldLabel = (f: string) => {
    const map: Record<string, string> = {
      stories_status: 'Stories · Status',
      feed_status:    'Feed · Status',
      acoes_status:   'Ação · Status',
      stories_content: 'Stories · Conteúdo',
      feed_content:    'Feed · Conteúdo',
      acoes_content:   'Ação · Conteúdo',
      legenda_copy:    'Legenda / Copy',
      observacoes:     'Observações',
    }
    return map[f] ?? f
  }

  return (
    <div className="divide-y divide-theme-border">
      {filtered.map(l => (
        <div key={l.id} className="py-3 flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-theme-surface flex items-center justify-center text-theme-secondary text-[10px] font-bold flex-shrink-0 mt-0.5">
            {l.user_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-theme-primary">{l.user_name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                l.action_type === 'status_change'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
              }`}>
                {l.action_type === 'status_change' ? 'Status' : 'Conteúdo'}
              </span>
              <span className="text-[10px] text-theme-muted">{l.client_name || '—'}</span>
            </div>
            <p className="text-xs text-theme-secondary mt-0.5">
              <span className="text-theme-muted">{fieldLabel(l.field)}:</span>{' '}
              {l.action_type === 'status_change'
                ? <><span className="text-theme-muted">{statusLabel(l.old_value)}</span> <ArrowRight size={10} className="inline text-theme-muted" /> <span className="text-theme-primary font-medium">{statusLabel(l.new_value)}</span></>
                : <span className="italic text-theme-muted">texto editado</span>
              }
            </p>
          </div>
          <span className="text-[10px] text-theme-muted whitespace-nowrap flex-shrink-0">{fmtDatetime(l.created_at)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Cards by client (per user) ───────────────────────────────────────────────
function ClientBreakdown({ logs, selectedUser }: { logs: LogRow[]; selectedUser: string }) {
  const userLogs = logs.filter(l => selectedUser === 'all' || l.user_name === selectedUser)

  // Group by user → client → count
  const byUserClient: Record<string, Record<string, number>> = {}
  for (const l of userLogs) {
    if (!byUserClient[l.user_name]) byUserClient[l.user_name] = {}
    const cname = l.client_name || l.client_id
    byUserClient[l.user_name][cname] = (byUserClient[l.user_name][cname] || 0) + 1
  }

  const users = Object.entries(byUserClient)
  if (users.length === 0) {
    return <p className="text-sm text-theme-muted text-center py-6">Sem dados no período.</p>
  }

  return (
    <div className="space-y-6">
      {users.map(([uname, clients]) => {
        const total = Object.values(clients).reduce((a, b) => a + b, 0)
        const sorted = Object.entries(clients).sort((a, b) => b[1] - a[1])
        const max = sorted[0][1]
        return (
          <div key={uname}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-[10px]">
                {uname.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-theme-primary">{uname}</span>
              <span className="text-xs text-theme-muted">{total} ações</span>
            </div>
            <div className="space-y-1.5">
              {sorted.map(([cname, count]) => (
                <div key={cname} className="flex items-center gap-3">
                  <span className="text-xs text-theme-secondary w-32 truncate">{cname}</span>
                  <div className="flex-1 h-2 bg-theme-surface rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-theme-muted w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProdutividadePage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [logs,       setLogs]       = useState<LogRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [range,      setRange]      = useState<DateRange>('7d')
  const [customFrom, setCustomFrom] = useState(toYMD(new Date()))
  const [customTo,   setCustomTo]   = useState(toYMD(new Date()))
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [activeTab,  setActiveTab]  = useState<'feed' | 'transicoes' | 'clientes'>('feed')

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard')
  }, [authLoading, isAdmin, router])

  // Fetch logs
  useEffect(() => {
    const from = rangeStart(range, customFrom)
    const to   = rangeEnd(range, customTo)
    setLoading(true)
    const supabase = createDataClient()
    supabase
      .from('activity_log')
      .select('*')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setLogs(data as LogRow[])
        setLoading(false)
      })
  }, [range, customFrom, customTo])

  const days = useMemo(() => daysBetween(rangeStart(range, customFrom), rangeEnd(range, customTo)), [range, customFrom, customTo])

  const assistants = useMemo(() => {
    const seen: Record<string, boolean> = {}
    const names: string[] = []
    for (const l of logs) { if (!seen[l.user_name]) { seen[l.user_name] = true; names.push(l.user_name) } }
    return names.sort()
  }, [logs])

  const filteredLogs = useMemo(() =>
    selectedUser === 'all' ? logs : logs.filter(l => l.user_name === selectedUser),
  [logs, selectedUser])

  const byUser = useMemo(() => {
    const map: Record<string, LogRow[]> = {}
    for (const l of logs) {
      if (!map[l.user_name]) map[l.user_name] = []
      map[l.user_name].push(l)
    }
    return map
  }, [logs])

  // KPIs
  const totalActions   = filteredLogs.length
  const statusChanges  = filteredLogs.filter(l => l.action_type === 'status_change').length
  const contentEdits   = filteredLogs.filter(l => l.action_type === 'content_edit').length
  const uniqueUsers    = new Set(filteredLogs.map(l => l.user_name)).size

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-theme-bg">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border bg-theme-bg flex-shrink-0">
        <div className="flex items-center gap-3">
          <BarChart2 size={20} className="text-emerald-500" />
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Produtividade</h1>
            <p className="text-xs text-theme-muted">Atividade das assistentes</p>
          </div>
        </div>

        {/* Filtros de período */}
        <div className="flex items-center gap-2">
          {(['7d', '30d', 'mes', 'custom'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                range === r
                  ? 'bg-emerald-500 text-black border-emerald-500'
                  : 'bg-theme-surface text-theme-secondary border-theme-border hover:border-theme-border-strong'
              }`}
            >
              {r === '7d' ? 'Últimos 7 dias' : r === '30d' ? 'Últimos 30 dias' : r === 'mes' ? 'Este mês' : 'Personalizado'}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-xs bg-theme-surface border border-theme-border rounded-lg px-2 py-1.5 text-theme-secondary focus:outline-none focus:border-emerald-500" />
              <span className="text-theme-muted text-xs">→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-xs bg-theme-surface border border-theme-border rounded-lg px-2 py-1.5 text-theme-secondary focus:outline-none focus:border-emerald-500" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6">
        {/* ── KPI cards ── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <TrendingUp size={16} />, label: 'Total de ações', value: totalActions, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { icon: <ArrowRight size={16} />, label: 'Mudanças de status', value: statusChanges, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: <Layers size={16} />,     label: 'Edições de conteúdo', value: contentEdits, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { icon: <Users size={16} />,      label: 'Assistentes ativas', value: uniqueUsers, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} className="bg-theme-card border border-theme-border rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>
                {icon}
              </div>
              <div>
                <p className="text-xs text-theme-muted">{label}</p>
                <p className="text-2xl font-bold text-theme-primary">{loading ? '—' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 bg-theme-card border border-theme-border rounded-2xl">
            <BarChart2 size={32} className="text-theme-muted" />
            <p className="text-theme-secondary text-sm">Nenhuma atividade registrada ainda.</p>
            <p className="text-theme-muted text-xs text-center max-w-sm">
              Os logs aparecerão aqui assim que as assistentes começarem a alterar status ou editar conteúdos.
            </p>
          </div>
        ) : (
          <>
            {/* ── Per-user cards ── */}
            <div>
              <h2 className="text-sm font-semibold text-theme-primary mb-3 flex items-center gap-2">
                <Users size={14} className="text-theme-muted" />
                Por assistente
              </h2>
              <div className={`grid gap-4 ${Object.keys(byUser).length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                {Object.entries(byUser)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([name, userLogs]) => (
                    <UserCard key={name} userName={name} logs={userLogs} days={days} />
                  ))
                }
              </div>
            </div>

            {/* ── Detail section ── */}
            <div className="bg-theme-card border border-theme-border rounded-2xl overflow-hidden">
              {/* Tab bar + user filter */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-theme-border bg-theme-surface/40">
                <div className="flex gap-1">
                  {([
                    ['feed',       'Feed de atividade',   <Calendar size={13} />],
                    ['transicoes', 'Transições de status', <ArrowRight size={13} />],
                    ['clientes',   'Por cliente',         <Layers size={13} />],
                  ] as const).map(([tab, label, icon]) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeTab === tab
                          ? 'bg-theme-card text-theme-primary shadow-sm border border-theme-border'
                          : 'text-theme-muted hover:text-theme-secondary'
                      }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {/* User filter */}
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="text-xs bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1.5 text-theme-secondary focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todas as assistentes</option>
                  {assistants.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="p-5">
                {activeTab === 'feed' && (
                  <ActivityFeed logs={logs} selectedUser={selectedUser} />
                )}
                {activeTab === 'transicoes' && (
                  <TransitionTable logs={logs} selectedUser={selectedUser} />
                )}
                {activeTab === 'clientes' && (
                  <ClientBreakdown logs={logs} selectedUser={selectedUser} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
