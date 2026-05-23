'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ArrowRight, CalendarDays, AlertCircle, LayoutGrid } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntryStatus } from '@/app/lib/entries'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Client = { id: string; name: string; color: string }
type StatusCounts = Partial<Record<NonNullable<DayEntryStatus>, number>>
type DayCell = { s: DayEntryStatus; f: DayEntryStatus; a: DayEntryStatus }

type ClientSummary = {
  client: Client
  monthRef: string
  hasMonth: boolean
  totalItems: number
  postedItems: number
  statusCounts: StatusCounts
  totalDays: number
  dayData: Record<string, DayCell>   // 'YYYY-MM-DD' → statuses por tipo
}

// ─── Configuração de status (excluindo CANCELADO da barra de progresso) ───────
const STATUS_CONFIG: Record<NonNullable<DayEntryStatus>, { label: string; color: string; bg: string }> = {
  AGUARDANDO: { label: 'Ag. Aprovação', color: 'text-amber-400',  bg: 'bg-amber-500'  },
  A_FAZER:    { label: 'A Fazer',       color: 'text-zinc-400',   bg: 'bg-zinc-500'   },
  ANDAMENTO:  { label: 'Em Andamento',  color: 'text-blue-400',   bg: 'bg-blue-500'   },
  VALIDACAO:  { label: 'Em Validação',  color: 'text-purple-400', bg: 'bg-purple-500' },
  CORRECAO:   { label: 'Em Correção',   color: 'text-red-400',    bg: 'bg-red-500'    },
  CANCELADO:  { label: 'Cancelado',     color: 'text-zinc-600',   bg: 'bg-zinc-700'   },
  POSTADO:    { label: 'Postado',       color: 'text-emerald-400',bg: 'bg-emerald-500'},
}

// Status visíveis nos cards (sem CANCELADO para não poluir)
const VISIBLE_STATUSES: NonNullable<DayEntryStatus>[] = [
  'POSTADO', 'ANDAMENTO', 'VALIDACAO', 'CORRECAO', 'AGUARDANDO', 'A_FAZER',
]

// ─── Helpers de mês ───────────────────────────────────────────────────────────
function currentMonthRef(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(ref: string, delta: 1 | -1): string {
  const [y, m] = ref.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(ref: string): string {
  return new Date(ref + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─── Componente de card de cliente ───────────────────────────────────────────
function ClientCard({ summary, onClick }: { summary: ClientSummary; onClick: () => void }) {
  const { client, hasMonth, totalItems, postedItems, statusCounts, totalDays } = summary
  const pct = totalItems > 0 ? Math.round((postedItems / totalItems) * 100) : 0

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200"
    >
      {/* Header do card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: client.color }}
          />
          <span className="text-white font-semibold text-sm leading-tight">{client.name}</span>
        </div>
        <ArrowRight
          size={15}
          className="text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all mt-0.5 flex-shrink-0"
        />
      </div>

      {!hasMonth ? (
        /* Sem planejamento */
        <div className="flex items-center gap-2 py-3 text-zinc-600">
          <AlertCircle size={14} />
          <span className="text-xs">Sem planejamento para este mês</span>
        </div>
      ) : (
        <>
          {/* Barra de progresso */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-500">
                {postedItems} / {totalItems} postados
              </span>
              <span className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-zinc-400'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-zinc-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {VISIBLE_STATUSES.map(status => {
              const count = statusCounts[status]
              if (!count) return null
              const cfg = STATUS_CONFIG[status]
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-zinc-800 ${cfg.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg}`} />
                  {count}
                </span>
              )
            })}
          </div>

          {/* Rodapé */}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-1.5 text-zinc-600">
            <CalendarDays size={11} />
            <span className="text-xs">{totalDays} dias planejados</span>
          </div>
        </>
      )}
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
// ─── Cor de célula da tabela (status mais crítico vence) ─────────────────────
const STATUS_PRIORITY: NonNullable<DayEntryStatus>[] = [
  'CORRECAO', 'AGUARDANDO', 'VALIDACAO', 'ANDAMENTO', 'A_FAZER', 'POSTADO', 'CANCELADO',
]
const CELL_COLOR: Record<NonNullable<DayEntryStatus>, string> = {
  CORRECAO:   'bg-red-500/80',
  AGUARDANDO: 'bg-amber-500/80',
  VALIDACAO:  'bg-purple-500/70',
  ANDAMENTO:  'bg-blue-500/70',
  A_FAZER:    'bg-zinc-600/60',
  POSTADO:    'bg-emerald-500/80',
  CANCELADO:  'bg-zinc-800',
}
function cellColor(cell: DayCell | undefined): string {
  if (!cell) return ''
  const statuses = [cell.s, cell.f, cell.a].filter(Boolean) as NonNullable<DayEntryStatus>[]
  if (!statuses.length) return ''
  for (const p of STATUS_PRIORITY) {
    if (statuses.includes(p)) return CELL_COLOR[p]
  }
  return ''
}

// ─── Tabela clientes × dias ───────────────────────────────────────────────────
function TabelaView({
  summaries,
  monthRef,
  onNavigate,
}: {
  summaries: ClientSummary[]
  monthRef: string
  onNavigate: (clientId: string) => void
}) {
  const [y, m] = monthRef.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const today = new Date().getDate()
  const isCurrentMonth = monthRef === currentMonthRef()

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800">
            <th className="sticky left-0 z-10 bg-zinc-900 px-4 py-3 text-left text-zinc-500 font-medium min-w-[140px]">
              Cliente
            </th>
            {days.map(d => (
              <th
                key={d}
                className={`px-1 py-3 text-center font-medium w-8 min-w-[28px] ${
                  isCurrentMonth && d === today ? 'text-emerald-400' : 'text-zinc-600'
                }`}
              >
                {d}
              </th>
            ))}
            <th className="px-3 py-3 text-right text-zinc-500 font-medium whitespace-nowrap">%</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s, i) => {
            const pct = s.totalItems > 0 ? Math.round((s.postedItems / s.totalItems) * 100) : 0
            return (
              <tr
                key={s.client.id}
                className={`border-b border-zinc-800 hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                  i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/30'
                }`}
                onClick={() => onNavigate(s.client.id)}
              >
                {/* Nome do cliente */}
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.client.color }} />
                    <span className="text-zinc-300 font-medium truncate max-w-[100px]">{s.client.name}</span>
                  </div>
                </td>

                {/* Células por dia */}
                {days.map(d => {
                  const dateStr = `${monthRef}-${String(d).padStart(2, '0')}`
                  const cell = s.dayData[dateStr]
                  const color = cellColor(cell)
                  return (
                    <td key={d} className="px-0.5 py-1.5 text-center">
                      {color ? (
                        <span
                          className={`inline-block w-5 h-5 rounded ${color}`}
                          title={dateStr}
                        />
                      ) : (
                        <span className="inline-block w-5 h-5 rounded bg-zinc-800/40" />
                      )}
                    </td>
                  )
                })}

                {/* % postado */}
                <td className="px-3 py-2 text-right">
                  <span className={`font-semibold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {s.hasMonth ? `${pct}%` : '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/50 flex-wrap">
        <span className="text-xs text-zinc-600">Status da célula (prioridade):</span>
        {([
          ['Correção',   'bg-red-500/80'    ],
          ['Aguardando', 'bg-amber-500/80'  ],
          ['Validação',  'bg-purple-500/70' ],
          ['Andamento',  'bg-blue-500/70'   ],
          ['A Fazer',    'bg-zinc-600/60'   ],
          ['Postado',    'bg-emerald-500/80'],
        ] as const).map(([label, cls]) => (
          <span key={label} className="flex items-center gap-1 text-xs text-zinc-500">
            <span className={`w-3 h-3 rounded ${cls}`} />{label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [monthRef, setMonthRef] = useState(currentMonthRef)
  const [summaries, setSummaries] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const supabase = createDataClient()

        // 1. Busca todos os clientes
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, color')
          .order('name')

        if (!clients || cancelled) return

        // 2. Busca todos os month_lists para o mês selecionado
        const { data: monthLists } = await supabase
          .from('month_lists')
          .select('id, client_id, month_ref')
          .eq('month_ref', monthRef)

        const monthListMap = new Map<string, string>() // client_id → month_list_id
        for (const ml of monthLists ?? []) {
          monthListMap.set(ml.client_id, ml.id)
        }

        // 3. Busca todas as day_entries dos month_lists encontrados
        const monthListIds = Array.from(monthListMap.values())
        type Bucket = { statuses: DayEntryStatus[]; days: Record<string, DayCell> }
        const entriesByMonthList = new Map<string, Bucket>()

        if (monthListIds.length > 0) {
          const { data: entries } = await supabase
            .from('day_entries')
            .select('month_list_id, entry_date, stories_status, feed_status, acoes_status')
            .in('month_list_id', monthListIds)

          for (const entry of entries ?? []) {
            const key = entry.month_list_id
            if (!entriesByMonthList.has(key)) {
              entriesByMonthList.set(key, { statuses: [], days: {} })
            }
            const bucket = entriesByMonthList.get(key)!
            bucket.statuses.push(entry.stories_status, entry.feed_status, entry.acoes_status)
            bucket.days[entry.entry_date] = {
              s: entry.stories_status,
              f: entry.feed_status,
              a: entry.acoes_status,
            }
          }
        }

        // 4. Monta resumo por cliente
        const result: ClientSummary[] = clients.map(client => {
          const mlId = monthListMap.get(client.id)
          if (!mlId) {
            return {
              client,
              monthRef,
              hasMonth: false,
              totalItems: 0,
              postedItems: 0,
              statusCounts: {},
              totalDays: 0,
              dayData: {},
            }
          }

          const bucket = entriesByMonthList.get(mlId)
          const allStatuses = bucket?.statuses ?? []
          const statusCounts: StatusCounts = {}
          let totalItems = 0
          let postedItems = 0
          let totalDays = 0

          // Conta entradas (cada 3 statuses = 1 dia)
          totalDays = allStatuses.length / 3

          for (const s of allStatuses) {
            if (!s || s === 'CANCELADO') continue
            statusCounts[s] = (statusCounts[s] ?? 0) + 1
            totalItems++
            if (s === 'POSTADO') postedItems++
          }

          return {
            client,
            monthRef,
            hasMonth: true,
            totalItems,
            postedItems,
            statusCounts,
            totalDays,
            dayData: bucket?.days ?? {},
          }
        })

        if (!cancelled) setSummaries(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [monthRef])

  const withMonth = summaries.filter(s => s.hasMonth)
  const withoutMonth = summaries.filter(s => !s.hasMonth)
  const totalPosted = withMonth.reduce((a, s) => a + s.postedItems, 0)
  const totalItems  = withMonth.reduce((a, s) => a + s.totalItems, 0)
  const globalPct   = totalItems > 0 ? Math.round((totalPosted / totalItems) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">Todos os clientes</h1>
          {!loading && withMonth.length > 0 && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {globalPct}% postado no geral · {withMonth.length} clientes com planejamento
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Cards / Tabela */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-0.5">
            {([
              ['cards',  'Cards',  <LayoutGrid   size={15} />],
              ['tabela', 'Tabela', <CalendarDays size={15} />],
            ] as const).map(([mode, title, icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Seletor de mês */}
          <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthRef(r => shiftMonth(r, -1))}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-white font-medium capitalize min-w-[130px] text-center">
            {formatMonth(monthRef)}
          </span>
          <button
            onClick={() => setMonthRef(r => shiftMonth(r, 1))}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : summaries.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center mt-16">Nenhum cliente cadastrado.</p>
        ) : viewMode === 'tabela' ? (
          <TabelaView
            summaries={summaries}
            monthRef={monthRef}
            onNavigate={(clientId) => router.push(`/${clientId}/${monthRef}`)}
          />
        ) : (
          <>
            {/* Grid de clientes com planejamento */}
            {withMonth.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {withMonth.map(summary => (
                  <ClientCard
                    key={summary.client.id}
                    summary={summary}
                    onClick={() => router.push(`/${summary.client.id}/${monthRef}`)}
                  />
                ))}
              </div>
            )}

            {/* Clientes sem planejamento */}
            {withoutMonth.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">
                  Sem planejamento em {formatMonth(monthRef)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {withoutMonth.map(summary => (
                    <ClientCard
                      key={summary.client.id}
                      summary={summary}
                      onClick={() => router.push(`/${summary.client.id}/${monthRef}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
