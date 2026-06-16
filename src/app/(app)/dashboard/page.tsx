'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, ArrowRight, AlertCircle,
  LayoutGrid, LayoutList, Columns3, CalendarDays,
  Pencil, X, ChevronDown, Filter, Check,
} from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import { logActivity, type ActivityCtx } from '@/app/lib/activity'
import { useAuth } from '@/hooks/useAuth'
import type { DayEntryStatus, DayEntry } from '@/app/lib/entries'
import EditEntryModal from '@/components/EditEntryModal'
import ListaView    from '@/components/ListaView'
import StatusBadge  from '@/components/StatusBadge'

// ─── Types ────────────────────────────────────────────────────────────────────
type Client = { id: string; name: string; color: string }
type StatusCounts = Partial<Record<NonNullable<DayEntryStatus>, number>>

type ClientSummary = {
  client: Client
  monthRef: string
  hasMonth: boolean
  totalItems: number
  postedItems: number
  statusCounts: StatusCounts
  totalDays: number
}

type KanbanItem = {
  key: string
  client: Client
  entry: DayEntry
  type: 'stories' | 'feed' | 'acoes'
  typeLabel: string
  typeDot: string
  typeColor: string
  content: string | null
  status: DayEntryStatus
  format: string | null
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<NonNullable<DayEntryStatus>, { label: string; color: string; bg: string }> = {
  A_FAZER:    { label: 'A Fazer',       color: 'text-theme-secondary', bg: 'bg-zinc-500'     },
  ANDAMENTO:  { label: 'Em Andamento',  color: 'text-blue-400',        bg: 'bg-blue-500'     },
  AGUARDANDO: { label: 'Ag. Aprovação', color: 'text-amber-400',       bg: 'bg-amber-500'    },
  CORRECAO:   { label: 'Em Correção',   color: 'text-red-400',         bg: 'bg-red-500'      },
  AGENDADO:   { label: 'Agendado',      color: 'text-sky-400',         bg: 'bg-sky-500'      },
  CONCLUIDO:  { label: 'Concluído',     color: 'text-violet-400',      bg: 'bg-violet-500'   },
  POSTADO:    { label: 'Postado',       color: 'text-emerald-400',     bg: 'bg-emerald-500'  },
  CANCELADO:  { label: 'Cancelado/Pendente', color: 'text-theme-muted', bg: 'bg-theme-raised' },
}

const VISIBLE_STATUSES: NonNullable<DayEntryStatus>[] = [
  'POSTADO','ANDAMENTO','AGUARDANDO','CORRECAO','AGENDADO','CONCLUIDO','A_FAZER',
]

const KANBAN_COLUMNS: { status: DayEntryStatus; label: string; dot: string; accent: string }[] = [
  { status: 'A_FAZER',    label: 'A Fazer',       dot: 'bg-zinc-500',    accent: 'border-theme-border'    },
  { status: 'ANDAMENTO',  label: 'Em Andamento',  dot: 'bg-blue-500',    accent: 'border-blue-500/50'     },
  { status: 'AGUARDANDO', label: 'Ag. Aprovação', dot: 'bg-amber-500',   accent: 'border-amber-500/50'    },
  { status: 'CORRECAO',   label: 'Em Correção',   dot: 'bg-red-500',     accent: 'border-red-500/50'      },
  { status: 'AGENDADO',   label: 'Agendado',      dot: 'bg-sky-500',     accent: 'border-sky-500/50'      },
  { status: 'CONCLUIDO',  label: 'Concluído',     dot: 'bg-violet-500',  accent: 'border-violet-500/50'   },
  { status: 'POSTADO',    label: 'Postado',       dot: 'bg-emerald-500', accent: 'border-emerald-500/50'  },
  { status: 'CANCELADO',  label: 'Cancelado/Pendente', dot: 'bg-zinc-400', accent: 'border-theme-border'    },
]

const TYPE_CONFIG = {
  stories: { label: 'Stories', dot: 'bg-pink-400',    color: 'text-pink-600 dark:text-pink-400'       },
  feed:    { label: 'Feed',    dot: 'bg-blue-400',    color: 'text-blue-600 dark:text-blue-400'       },
  acoes:   { label: 'Ação',    dot: 'bg-emerald-400', color: 'text-emerald-600 dark:text-emerald-400' },
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const WEEK_DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function buildCalendarWeeks(monthRef: string) {
  const [year, month] = monthRef.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const start = new Date(firstDay); start.setDate(firstDay.getDate() - firstDay.getDay())
  const end   = new Date(lastDay);  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()))

  const weeks: { date: Date; dateStr: string; isCurrentMonth: boolean }[][] = []
  const cur = new Date(start)
  while (cur <= end) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(cur), dateStr: cur.toISOString().split('T')[0], isCurrentMonth: cur.getMonth() === month - 1 })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function currentMonthRef(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(ref: string, delta: 1 | -1): string {
  const [y, m] = ref.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function formatMonth(ref: string): string {
  return new Date(ref + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function formatDay(entry: DayEntry): string {
  const day = new Date(entry.entry_date + 'T12:00:00').getDate()
  return `${String(day).padStart(2, '0')} · ${entry.dia_semana}`
}

// ─── Client Card ──────────────────────────────────────────────────────────────
function ClientCard({ summary, onClick }: { summary: ClientSummary; onClick: () => void }) {
  const { client, hasMonth, totalItems, postedItems, statusCounts, totalDays } = summary
  const pct = totalItems > 0 ? Math.round((postedItems / totalItems) * 100) : 0

  return (
    <button onClick={onClick}
      className="group w-full text-left bg-theme-card border border-theme-border rounded-2xl p-5 hover:border-theme-border-strong hover:bg-theme-surface/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: client.color }} />
          <span className="text-theme-primary font-semibold text-sm leading-tight">{client.name}</span>
        </div>
        <ArrowRight size={15} className="text-theme-muted group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all mt-0.5 flex-shrink-0" />
      </div>

      {!hasMonth ? (
        <div className="flex items-center gap-2 py-3 text-theme-muted">
          <AlertCircle size={14} />
          <span className="text-xs">Sem planejamento para este mês</span>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-theme-secondary">{postedItems} / {totalItems} postados</span>
              <span className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-theme-secondary'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-zinc-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VISIBLE_STATUSES.map(status => {
              const count = statusCounts[status]
              if (!count) return null
              const cfg = STATUS_CONFIG[status]
              return (
                <span key={status} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-theme-surface ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg}`} />{count}
                </span>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-theme-border">
            <span className="text-xs text-theme-muted">{totalDays} dias planejados</span>
          </div>
        </>
      )}
    </button>
  )
}

// ─── Kanban global ────────────────────────────────────────────────────────────
const STATUS_FIELD_MAP: Record<'stories' | 'feed' | 'acoes', string> = {
  stories: 'stories_status',
  feed:    'feed_status',
  acoes:   'acoes_status',
}

function KanbanGlobal({ items, onEdit, onNavigate, onRefresh, activityCtx }: {
  items: KanbanItem[]
  onEdit: (e: DayEntry) => void
  onNavigate: (clientId: string) => void
  onRefresh: () => void
  activityCtx?: ActivityCtx
}) {
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [bulkSaving,  setBulkSaving]  = useState(false)
  const [bulkOpen,    setBulkOpen]    = useState(false)
  const [dragItem,    setDragItem]    = useState<KanbanItem | null>(null)
  const [dragOverCol, setDragOverCol] = useState<DayEntryStatus | null>(null)

  const selectionMode = selected.size > 0

  const handleDrop = async (targetStatus: DayEntryStatus) => {
    setDragOverCol(null)
    if (!dragItem || dragItem.status === targetStatus) { setDragItem(null); return }
    const supabase = createDataClient()
    await supabase.from('day_entries')
      .update({ [STATUS_FIELD_MAP[dragItem.type]]: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', dragItem.entry.id)
    if (activityCtx) {
      logActivity({
        ctx: { ...activityCtx, clientName: dragItem.client.name },
        actionType: 'status_change',
        entryId: dragItem.entry.id,
        clientId: dragItem.client.id,
        entryDate: dragItem.entry.entry_date,
        field: STATUS_FIELD_MAP[dragItem.type],
        oldValue: dragItem.status,
        newValue: targetStatus,
      })
    }
    setDragItem(null)
    onRefresh()
  }

  const toggleSelect = (key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const handleBulkStatus = async (newStatus: DayEntryStatus) => {
    setBulkSaving(true); setBulkOpen(false)
    const supabase = createDataClient()
    const toUpdate = items.filter(i => selected.has(i.key))
    await Promise.all(toUpdate.map(item =>
      supabase.from('day_entries')
        .update({ [STATUS_FIELD_MAP[item.type]]: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.entry.id)
    ))
    if (activityCtx) {
      for (const item of toUpdate) {
        logActivity({
          ctx: { ...activityCtx, clientName: item.client.name },
          actionType: 'status_change',
          entryId: item.entry.id,
          clientId: item.client.id,
          entryDate: item.entry.entry_date,
          field: STATUS_FIELD_MAP[item.type],
          oldValue: item.status,
          newValue: newStatus,
        })
      }
    }
    setBulkSaving(false)
    setSelected(new Set())
    onRefresh()
  }

  const byStatus = new Map<DayEntryStatus, KanbanItem[]>()
  for (const col of KANBAN_COLUMNS) byStatus.set(col.status, [])
  for (const item of items) {
    const key = item.status ?? 'A_FAZER'
    if (!byStatus.has(key)) byStatus.set(key, [])
    byStatus.get(key)!.push(item)
  }
  const visibleColumns = KANBAN_COLUMNS

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-16 items-start">
        {visibleColumns.map(col => {
          const colItems = byStatus.get(col.status) ?? []
          const selectedInCol = colItems.filter(i => selected.has(i.key)).length
          const isDragTarget = dragOverCol === col.status && dragItem?.status !== col.status
          return (
            <div
              key={col.status ?? 'null'}
              className="flex-shrink-0 w-[240px] flex flex-col"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.status) }}
              onDragLeave={() => setDragOverCol(prev => prev === col.status ? null : prev)}
              onDrop={() => handleDrop(col.status)}
            >
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl bg-theme-card border border-b-0 transition-colors
                ${isDragTarget ? 'bg-emerald-500/10 border-emerald-500/60' : col.accent}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                <span className="text-xs font-medium text-theme-secondary flex-1">{col.label}</span>
                <div className="flex items-center gap-1.5">
                  {selectedInCol > 0 && <span className="text-[10px] text-emerald-500 font-bold">{selectedInCol}✓</span>}
                  {colItems.length > 0 && <span className="text-xs text-theme-muted font-mono">{colItems.length}</span>}
                </div>
              </div>
              <div className={`flex-1 rounded-b-xl border p-2 space-y-2 min-h-[120px] transition-colors
                ${isDragTarget ? 'bg-emerald-500/5 border-emerald-500/60 border-dashed' : `bg-theme-bg/50 ${col.accent}`}`}>
                {isDragTarget && (
                  <div className="flex items-center justify-center h-10 text-xs text-emerald-500 font-medium">Soltar aqui</div>
                )}
                {colItems.length === 0 && !isDragTarget
                  ? <div className="flex items-center justify-center h-20"><span className="text-xs text-theme-muted">—</span></div>
                  : colItems.map(item => {
                      const typeCfg = TYPE_CONFIG[item.type]
                      const isSelected = selected.has(item.key)
                      return (
                        <div
                          key={item.key}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragItem(item) }}
                          onClick={() => selectionMode && toggleSelect(item.key)}
                          className={`group relative bg-theme-card border rounded-xl p-3 transition-all cursor-grab active:cursor-grabbing
                            ${isSelected ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30' : 'border-theme-border hover:border-theme-border-strong'}
                            ${selectionMode ? 'cursor-pointer' : ''}`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={e => { e.stopPropagation(); toggleSelect(item.key) }}
                            className={`absolute top-2.5 left-2.5 w-4 h-4 rounded border flex items-center justify-center transition-all
                              ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-theme-border bg-theme-surface opacity-0 group-hover:opacity-100'}
                              ${selectionMode ? '!opacity-100' : ''}`}
                          >
                            {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                          </button>

                          <div className={`transition-all ${isSelected || selectionMode ? 'pl-5' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.client.color }} />
                                <span className="text-xs text-theme-muted truncate max-w-[80px]">{item.client.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${typeCfg.dot}`} />
                                <span className={`text-xs font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
                              </div>
                            </div>
                            <p className="text-xs text-theme-secondary leading-relaxed line-clamp-3 min-h-[2.5rem]">
                              {item.content ?? <span className="text-theme-muted italic">Sem descrição</span>}
                            </p>
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-theme-border">
                              <span className="text-xs text-theme-muted">{formatDay(item.entry)}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={e => { e.stopPropagation(); onEdit(item.entry) }}
                                  className="text-theme-muted hover:text-emerald-500 p-0.5 rounded transition-colors" title="Editar">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); onNavigate(item.client.id) }}
                                  className="text-theme-muted hover:text-blue-500 p-0.5 rounded transition-colors" title="Ver cliente">
                                  <ArrowRight size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-theme-card border border-theme-border-strong rounded-2xl shadow-2xl px-5 py-3">
          <span className="text-sm font-semibold text-theme-primary whitespace-nowrap">
            {selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          <div className="w-px h-5 bg-theme-border" />
          <div className="relative">
            <button onClick={() => setBulkOpen(o => !o)} disabled={bulkSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors">
              {bulkSaving ? 'Salvando...' : 'Mover para'}
              <ChevronDown size={12} className={`transition-transform ${bulkOpen ? 'rotate-180' : ''}`} />
            </button>
            {bulkOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-theme-card border border-theme-border rounded-xl shadow-xl py-1.5 min-w-[160px] z-10">
                {KANBAN_COLUMNS.filter(c => c.status !== 'CANCELADO').map(col => (
                  <button key={col.status} onClick={() => handleBulkStatus(col.status)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-theme-secondary hover:bg-theme-surface hover:text-theme-primary transition-colors">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelected(new Set())}
            className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>
      )}
    </>
  )
}

// ─── Global Lista ─────────────────────────────────────────────────────────────
function GlobalListaView({ summaries, fullEntries, onRefresh, activityCtx }: {
  summaries: ClientSummary[]
  fullEntries: DayEntry[]
  onRefresh: () => void
  activityCtx?: Omit<ActivityCtx, 'clientName'>
}) {
  const byClient = useMemo(() => {
    const map = new Map<string, DayEntry[]>()
    for (const e of fullEntries) {
      if (!map.has(e.client_id)) map.set(e.client_id, [])
      map.get(e.client_id)!.push(e)
    }
    return map
  }, [fullEntries])

  const withEntries = summaries.filter(s => s.hasMonth && (byClient.get(s.client.id)?.length ?? 0) > 0)

  if (withEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-theme-secondary text-sm">Nenhum dia planejado para este mês.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {withEntries.map(({ client }) => {
        const entries = byClient.get(client.id) ?? []
        return (
          <div key={client.id}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
              <h3 className="text-sm font-semibold text-theme-primary">{client.name}</h3>
              <span className="text-xs text-theme-muted">{entries.length} dias planejados</span>
            </div>
            <ListaView
              entries={entries}
              onRefresh={onRefresh}
              activityCtx={activityCtx ? { ...activityCtx, clientName: client.name } : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Global Day Panel (Calendário) ────────────────────────────────────────────
function GlobalDayPanel({ dateStr, entries, clientMap, onClose, onEdit }: {
  dateStr: string
  entries: DayEntry[]
  clientMap: Map<string, Client>
  onClose: () => void
  onEdit: (e: DayEntry) => void
}) {
  const dt      = new Date(dateStr + 'T12:00:00')
  const weekDay = WEEK_DAYS[dt.getDay()]
  const month   = MONTH_NAMES[dt.getMonth()]
  const day     = dt.getDate()
  const year    = dt.getFullYear()

  const formats = [
    { key: 'stories', label: 'Stories', color: 'text-pink-500 dark:text-pink-400' },
    { key: 'feed',    label: 'Feed',    color: 'text-blue-500 dark:text-blue-400' },
    { key: 'acoes',   label: 'Ação',    color: 'text-emerald-500 dark:text-emerald-400' },
  ] as const

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] max-w-full z-40 bg-theme-card border-l border-theme-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-theme-border flex-shrink-0">
          <div>
            <p className="text-xs text-theme-muted uppercase tracking-widest font-medium mb-1">
              {weekDay} · {month} {year}
            </p>
            <h2 className="text-3xl font-bold text-theme-primary">{day}</h2>
            <p className="text-xs text-theme-muted mt-1">
              {entries.length} cliente{entries.length !== 1 ? 's' : ''} com planejamento
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-colors mt-1">
            <X size={16} />
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-theme-muted">Nenhum conteúdo planejado para este dia.</p>
            </div>
          ) : entries.map(entry => {
            const client = clientMap.get(entry.client_id)
            if (!client) return null
            const hasAny = formats.some(f =>
              entry[`${f.key}_status` as keyof DayEntry] || entry[`${f.key}_content` as keyof DayEntry]
            )
            return (
              <div key={entry.id} className="rounded-xl border border-theme-border overflow-hidden">
                {/* Client header */}
                <div className="flex items-center justify-between px-4 py-3 bg-theme-surface/50 border-b border-theme-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
                    <span className="text-sm font-semibold text-theme-primary">{client.name}</span>
                  </div>
                  <button onClick={() => onEdit(entry)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface hover:bg-theme-raised text-theme-secondary text-xs rounded-lg transition-colors">
                    <Pencil size={11} />
                    Editar
                  </button>
                </div>

                {/* Formats */}
                <div className="p-4 space-y-3">
                  {hasAny ? formats.map(({ key, label, color }) => {
                    const statusKey  = `${key}_status`  as keyof DayEntry
                    const contentKey = `${key}_content` as keyof DayEntry
                    const status  = entry[statusKey]  as DayEntryStatus
                    const content = entry[contentKey] as string | null
                    if (!status && !content) return null
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${color}`}>{label}</span>
                          {status && <StatusBadge status={status} />}
                        </div>
                        {content && (
                          <p className="text-sm text-theme-secondary leading-relaxed">{content}</p>
                        )}
                      </div>
                    )
                  }) : (
                    <p className="text-xs text-theme-muted italic">Sem conteúdo descrito.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Global Calendar Cell ─────────────────────────────────────────────────────
const GLOBAL_TYPE_CHIP = {
  stories: { label: 'Stories', border: 'border-l-pink-400',    bg: 'bg-pink-500/10'    },
  feed:    { label: 'Feed',    border: 'border-l-blue-400',    bg: 'bg-blue-500/10'    },
  acoes:   { label: 'Ação',   border: 'border-l-emerald-400', bg: 'bg-emerald-500/10' },
}

function GlobalCalCell({ cell, dayEntries, clientMap, onSelect }: {
  cell: { date: Date; dateStr: string; isCurrentMonth: boolean }
  dayEntries: DayEntry[]
  clientMap: Map<string, Client>
  onSelect: (dateStr: string) => void
}) {
  const { date, dateStr, isCurrentMonth } = cell
  const isToday = dateStr === new Date().toISOString().split('T')[0]
  const day = date.getDate()

  // Gera chips: só onde há conteúdo preenchido
  const chips = isCurrentMonth
    ? dayEntries.flatMap(entry => {
        const client = clientMap.get(entry.client_id)
        if (!client) return []
        return (
          [
            ['stories', entry.stories_content] as const,
            ['feed',    entry.feed_content   ] as const,
            ['acoes',   entry.acoes_content  ] as const,
          ]
            .filter(([, content]) => !!content)
            .map(([type]) => ({ type, clientName: client.name, clientColor: client.color }))
        )
      })
    : []

  const MAX_VISIBLE = 4

  return (
    <div
      onClick={() => chips.length > 0 && onSelect(dateStr)}
      className={`min-h-[100px] p-2 border-b border-r border-theme-border transition-colors
        ${isCurrentMonth ? 'bg-theme-bg' : 'bg-theme-surface/20'}
        ${chips.length > 0 ? 'cursor-pointer hover:bg-theme-surface/30' : 'cursor-default'}`}
    >
      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1.5
        ${isToday ? 'bg-emerald-500 text-black font-bold' : isCurrentMonth ? 'text-theme-primary' : 'text-theme-muted'}`}>
        {day}
      </span>

      <div className="flex flex-col gap-0.5">
        {chips.slice(0, MAX_VISIBLE).map((chip, i) => {
          const cfg = GLOBAL_TYPE_CHIP[chip.type]
          return (
            <div key={i}
              className={`flex items-center gap-1 border-l-2 ${cfg.border} ${cfg.bg} rounded-r px-1.5 py-0.5 truncate`}
              title={`${chip.clientName} | ${cfg.label}`}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: chip.clientColor }} />
              <span className="text-[10px] font-medium text-theme-secondary truncate flex-1">
                {chip.clientName} | {cfg.label}
              </span>
            </div>
          )
        })}
        {chips.length > MAX_VISIBLE && (
          <span className="text-[10px] text-theme-muted pl-1">+{chips.length - MAX_VISIBLE} mais</span>
        )}
      </div>
    </div>
  )
}

// ─── Global Calendar View ─────────────────────────────────────────────────────
function GlobalCalendarView({ fullEntries, clientMap, monthRef, onEdit, onRefresh, activityCtx }: {
  fullEntries: DayEntry[]
  clientMap: Map<string, Client>
  monthRef: string
  onEdit: (e: DayEntry) => void
  onRefresh: () => void
  activityCtx?: Omit<ActivityCtx, 'clientName'>
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>()
    for (const e of fullEntries) {
      if (!map.has(e.entry_date)) map.set(e.entry_date, [])
      map.get(e.entry_date)!.push(e)
    }
    return map
  }, [fullEntries])

  const weeks = useMemo(() => buildCalendarWeeks(monthRef), [monthRef])

  // Build legend (clients that have any entry this month)
  const activeClients = useMemo(() => {
    const seen = new Set<string>()
    const list: Client[] = []
    for (const e of fullEntries) {
      if (!seen.has(e.client_id)) {
        seen.add(e.client_id)
        const c = clientMap.get(e.client_id)
        if (c) list.push(c)
      }
    }
    return list
  }, [fullEntries, clientMap])

  return (
    <>
      <div className="bg-theme-card rounded-xl border border-theme-border overflow-hidden">
        {/* Legend */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-theme-border bg-theme-card flex-wrap">
          <span className="text-xs text-theme-muted">Clientes:</span>
          {activeClients.map(c => (
            <span key={c.id} className="flex items-center gap-1.5 text-xs text-theme-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </span>
          ))}
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-theme-border">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-theme-muted">{d}</div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(cell => (
              <GlobalCalCell
                key={cell.dateStr}
                cell={cell}
                dayEntries={byDate.get(cell.dateStr) ?? []}
                clientMap={clientMap}
                onSelect={setSelectedDate}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDate && !editingEntry && (
        <GlobalDayPanel
          dateStr={selectedDate}
          entries={byDate.get(selectedDate) ?? []}
          clientMap={clientMap}
          onClose={() => setSelectedDate(null)}
          onEdit={(e) => { setEditingEntry(e) }}
        />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); setSelectedDate(null); onRefresh() }}
          activityCtx={activityCtx
            ? { ...activityCtx, clientName: clientMap.get(editingEntry.client_id)?.name ?? '' }
            : undefined}
        />
      )}
    </>
  )
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown<T extends string>({
  label, options, selected, onToggle, onClear,
}: {
  label: string
  options: { value: T; label: string; color?: string }[]
  selected: T[]
  onToggle: (v: T) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const hasSelection = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
          ${hasSelection
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            : 'bg-theme-surface border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-border-strong'
          }`}
      >
        <Filter size={12} />
        {label}
        {hasSelection && <span className="bg-emerald-500 text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{selected.length}</span>}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 bg-theme-card border border-theme-border rounded-xl shadow-xl min-w-[180px] py-1.5 overflow-hidden">
          {hasSelection && (
            <button
              onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-colors border-b border-theme-border mb-1"
            >
              Limpar filtro
            </button>
          )}
          {options.map(opt => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs transition-colors
                  ${active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-theme-secondary hover:bg-theme-surface hover:text-theme-primary'}`}
              >
                {opt.color
                  ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  : <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-emerald-500' : 'bg-theme-border'}`} />
                }
                <span className="flex-1">{opt.label}</span>
                {active && <span className="text-emerald-500">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
type ViewMode = 'cards' | 'lista' | 'kanban' | 'calendario'

export default function DashboardPage() {
  const router = useRouter()
  const { userId, userName } = useAuth()
  const [monthRef,  setMonthRef]  = useState(currentMonthRef)
  const [summaries, setSummaries] = useState<ClientSummary[]>([])
  const [loading,   setLoading]   = useState(true)
  const [viewMode,  setViewMode]  = useState<ViewMode>('cards')

  // Filter state
  const [filterClients,  setFilterClients]  = useState<string[]>([])
  const [filterStatuses, setFilterStatuses] = useState<NonNullable<DayEntryStatus>[]>([])

  // Full entry data (loaded lazily for lista / kanban / calendario)
  const [fullEntries,  setFullEntries]  = useState<DayEntry[]>([])
  const [clientMap,    setClientMap]    = useState<Map<string, Client>>(new Map())
  const [loadingFull,  setLoadingFull]  = useState(false)

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)

  // ─── Load summaries (cards + lightweight status data) ────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setFullEntries([])
      try {
        const supabase = createDataClient()
        const { data: clients } = await supabase.from('clients').select('id, name, color').order('name')
        if (!clients || cancelled) return

        const { data: monthLists } = await supabase.from('month_lists').select('id, client_id, month_ref').eq('month_ref', monthRef)
        const mlMap = new Map<string, string>()
        for (const ml of monthLists ?? []) mlMap.set(ml.client_id, ml.id)

        const mlIds = Array.from(mlMap.values())
        const buckets = new Map<string, { statuses: DayEntryStatus[] }>()

        if (mlIds.length > 0) {
          const { data: entries } = await supabase
            .from('day_entries')
            .select('month_list_id, stories_status, feed_status, acoes_status')
            .in('month_list_id', mlIds)
          for (const e of entries ?? []) {
            const key = e.month_list_id
            if (!buckets.has(key)) buckets.set(key, { statuses: [] })
            buckets.get(key)!.statuses.push(e.stories_status, e.feed_status, e.acoes_status)
          }
        }

        const result: ClientSummary[] = clients.map(client => {
          const mlId = mlMap.get(client.id)
          if (!mlId) return { client, monthRef, hasMonth: false, totalItems: 0, postedItems: 0, statusCounts: {}, totalDays: 0 }
          const allStatuses = buckets.get(mlId)?.statuses ?? []
          const statusCounts: StatusCounts = {}
          let totalItems = 0, postedItems = 0
          for (const s of allStatuses) {
            if (!s || s === 'CANCELADO') continue
            statusCounts[s] = (statusCounts[s] ?? 0) + 1
            totalItems++
            if (s === 'POSTADO') postedItems++
          }
          return { client, monthRef, hasMonth: true, totalItems, postedItems, statusCounts, totalDays: allStatuses.length / 3 }
        })

        if (!cancelled) setSummaries(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [monthRef])

  // ─── Load full entries (lista / kanban / calendario) ─────────────────────────
  const loadFull = useCallback(async () => {
    setLoadingFull(true)
    try {
      const supabase = createDataClient()
      const { data: monthLists } = await supabase.from('month_lists').select('id, client_id').eq('month_ref', monthRef)
      if (!monthLists?.length) { setFullEntries([]); return }

      const mlIds = monthLists.map(ml => ml.id)
      const newClientMap = new Map<string, Client>()
      for (const s of summaries) newClientMap.set(s.client.id, s.client)
      const mlToClient = new Map(monthLists.map(ml => [ml.id, ml.client_id]))

      const { data: rawEntries } = await supabase
        .from('day_entries')
        .select('*')
        .in('month_list_id', mlIds)
        .order('entry_date')

      // Ensure client_id is set correctly from the month_list → client mapping
      const entries: DayEntry[] = (rawEntries ?? []).map(e => ({
        ...e,
        client_id: mlToClient.get(e.month_list_id) ?? e.client_id,
      })) as DayEntry[]

      setFullEntries(entries)
      setClientMap(newClientMap)
    } finally {
      setLoadingFull(false)
    }
  }, [monthRef, summaries])

  // Load full data when switching to a view that needs it
  useEffect(() => {
    if (!loading && (viewMode === 'lista' || viewMode === 'kanban' || viewMode === 'calendario') && fullEntries.length === 0) {
      loadFull()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, loading])

  // Reset full data when month changes (not on view switch — keeps cache between views)
  useEffect(() => {
    setFullEntries([])
  }, [monthRef])

  // Filter helpers
  const toggleClient = (id: string) =>
    setFilterClients(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleStatus = (s: NonNullable<DayEntryStatus>) =>
    setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  // Filtered summaries (for cards view)
  const filteredSummaries = useMemo(() => {
    let result = summaries
    if (filterClients.length > 0)
      result = result.filter(s => filterClients.includes(s.client.id))
    return result
  }, [summaries, filterClients])

  // Filtered full entries (for lista / kanban / calendario)
  const filteredEntries = useMemo(() => {
    let result = fullEntries
    if (filterClients.length > 0)
      result = result.filter(e => filterClients.includes(e.client_id))
    if (filterStatuses.length > 0) {
      result = result.filter(e => {
        const statuses = [e.stories_status, e.feed_status, e.acoes_status]
        return statuses.some(s => s && filterStatuses.includes(s as NonNullable<DayEntryStatus>))
      })
    }
    return result
  }, [fullEntries, filterClients, filterStatuses])

  // Derived kanban items
  const kanbanItems = useMemo<KanbanItem[]>(() => {
    const items: KanbanItem[] = []
    for (const entry of filteredEntries) {
      const client = clientMap.get(entry.client_id)
      if (!client) continue
      const pieces: ['stories' | 'feed' | 'acoes', string | null, DayEntryStatus, string | null][] = [
        ['stories', entry.stories_content, entry.stories_status, entry.stories_format],
        ['feed',    entry.feed_content,    entry.feed_status,    entry.feed_format   ],
        ['acoes',   entry.acoes_content,   entry.acoes_status,   entry.acoes_format  ],
      ]
      for (const [type, content, status, format] of pieces) {
        if (!content) continue   // só exibe cards com descrição preenchida
        const cfg = TYPE_CONFIG[type]
        items.push({ key: `${entry.id}-${type}`, client, entry, type, typeLabel: cfg.label,
          typeDot: cfg.dot, typeColor: cfg.color, content, status, format })
      }
    }
    return items
  }, [fullEntries, clientMap])

  const withMonth    = filteredSummaries.filter(s => s.hasMonth)
  const withoutMonth = filteredSummaries.filter(s => !s.hasMonth)
  const totalPosted  = withMonth.reduce((a, s) => a + s.postedItems, 0)
  const totalItems   = withMonth.reduce((a, s) => a + s.totalItems, 0)
  const globalPct    = totalItems > 0 ? Math.round((totalPosted / totalItems) * 100) : 0

  // Options for filter dropdowns (built from loaded summaries)
  const clientOptions = useMemo(() =>
    summaries.map(s => ({ value: s.client.id, label: s.client.name, color: s.client.color })),
  [summaries])

  const statusOptions: { value: NonNullable<DayEntryStatus>; label: string }[] = [
    { value: 'A_FAZER',    label: 'A Fazer'       },
    { value: 'ANDAMENTO',  label: 'Em Andamento'  },
    { value: 'AGUARDANDO', label: 'Ag. Aprovação' },
    { value: 'CORRECAO',   label: 'Em Correção'   },
    { value: 'AGENDADO',   label: 'Agendado'      },
    { value: 'CONCLUIDO',  label: 'Concluído'     },
    { value: 'POSTADO',    label: 'Postado'       },
    { value: 'CANCELADO',  label: 'Cancelado'     },
  ]

  const hasFilters = filterClients.length > 0 || filterStatuses.length > 0

  const needsFullLoad = viewMode !== 'cards'
  const isFullLoading = loadingFull || (needsFullLoad && !loading && fullEntries.length === 0 && withMonth.length > 0)

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ── Topbar ── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border flex-shrink-0 bg-theme-bg">
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Todos os clientes</h1>
            {!loading && withMonth.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {globalPct}% postado no geral · {withMonth.length} clientes com planejamento
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Filters */}
            {!loading && summaries.length > 0 && (
              <div className="flex items-center gap-2">
                <FilterDropdown
                  label="Cliente"
                  options={clientOptions}
                  selected={filterClients}
                  onToggle={toggleClient}
                  onClear={() => setFilterClients([])}
                />
                <FilterDropdown
                  label="Status"
                  options={statusOptions}
                  selected={filterStatuses}
                  onToggle={toggleStatus}
                  onClear={() => setFilterStatuses([])}
                />
                {hasFilters && (
                  <button
                    onClick={() => { setFilterClients([]); setFilterStatuses([]) }}
                    className="text-xs text-theme-muted hover:text-theme-primary transition-colors px-1"
                    title="Limpar filtros"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* View toggle */}
            <div className="flex items-center bg-theme-surface rounded-lg p-1 gap-0.5">
              {([
                ['cards',      'Visão Geral', <LayoutGrid   size={15} />],
                ['lista',      'Lista',       <LayoutList   size={15} />],
                ['kanban',     'Kanban',      <Columns3     size={15} />],
                ['calendario', 'Calendário',  <CalendarDays size={15} />],
              ] as const).map(([mode, title, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} title={title}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-theme-card text-theme-primary shadow-sm'
                      : 'text-zinc-500 hover:text-theme-secondary'
                  }`}>
                  {icon}
                </button>
              ))}
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthRef(r => shiftMonth(r, -1))}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-theme-primary hover:bg-theme-surface transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-theme-primary font-medium capitalize min-w-[130px] text-center">
                {formatMonth(monthRef)}
              </span>
              <button onClick={() => setMonthRef(r => shiftMonth(r, 1))}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-theme-primary hover:bg-theme-surface transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto px-8 py-6 bg-theme-bg">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>

          ) : summaries.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center mt-16">Nenhum cliente cadastrado.</p>

          ) : filteredSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <p className="text-theme-secondary text-sm">Nenhum cliente encontrado com esses filtros.</p>
              <button onClick={() => { setFilterClients([]); setFilterStatuses([]) }}
                className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                Limpar filtros
              </button>
            </div>

          ) : viewMode === 'cards' ? (
            <>
              {withMonth.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {withMonth.map(s => (
                    <ClientCard key={s.client.id} summary={s}
                      onClick={() => router.push(`/${s.client.id}/${monthRef}`)} />
                  ))}
                </div>
              )}
              {withoutMonth.length > 0 && (
                <div>
                  <p className="text-xs text-theme-muted uppercase tracking-wider font-medium mb-3">
                    Sem planejamento em {formatMonth(monthRef)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {withoutMonth.map(s => (
                      <ClientCard key={s.client.id} summary={s}
                        onClick={() => router.push(`/${s.client.id}/${monthRef}`)} />
                    ))}
                  </div>
                </div>
              )}
            </>

          ) : isFullLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>

          ) : viewMode === 'lista' ? (
            <GlobalListaView
              summaries={filteredSummaries}
              fullEntries={filteredEntries}
              onRefresh={loadFull}
              activityCtx={userId ? { userId, userName } : undefined}
            />

          ) : viewMode === 'kanban' ? (
            kanbanItems.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-theme-secondary text-sm">Nenhum conteúdo planejado para {formatMonth(monthRef)}.</p>
              </div>
            ) : (
              <KanbanGlobal
                items={kanbanItems}
                onEdit={setEditingEntry}
                onNavigate={(id) => router.push(`/${id}/${monthRef}`)}
                onRefresh={loadFull}
                activityCtx={userId ? { userId, userName, clientName: '' } : undefined}
              />
            )

          ) : (
            /* ── Calendário global ── */
            filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-theme-secondary text-sm">Nenhum conteúdo planejado para {formatMonth(monthRef)}.</p>
              </div>
            ) : (
              <GlobalCalendarView
                fullEntries={filteredEntries}
                clientMap={clientMap}
                monthRef={monthRef}
                onEdit={setEditingEntry}
                onRefresh={loadFull}
                activityCtx={userId ? { userId, userName } : undefined}
              />
            )
          )}
        </div>
      </div>

      {editingEntry && (
        <EditEntryModal entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); loadFull() }}
          activityCtx={userId
            ? { userId, userName, clientName: clientMap.get(editingEntry.client_id)?.name ?? '' }
            : undefined} />
      )}
    </>
  )
}
