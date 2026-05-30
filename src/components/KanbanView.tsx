'use client'

import { useState, useMemo } from 'react'
import { Pencil, Check, X, ChevronDown } from 'lucide-react'
import EditEntryModal from './EditEntryModal'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

type ContentType = 'stories' | 'feed' | 'acoes'

type ContentItem = {
  key: string; entry: DayEntry; type: ContentType
  typeLabel: string; typeDot: string; content: string | null
  status: DayEntryStatus; format: string | null
}

type Props = { entries: DayEntry[]; onRefresh: () => void }

type Column = { status: DayEntryStatus; label: string; dotColor: string; accent: string }

const COLUMNS: Column[] = [
  { status: 'A_FAZER',    label: 'A Fazer',       dotColor: 'bg-zinc-500',    accent: 'border-theme-border'   },
  { status: 'ANDAMENTO',  label: 'Em Andamento',  dotColor: 'bg-blue-500',    accent: 'border-blue-500/50'    },
  { status: 'AGUARDANDO', label: 'Ag. Aprovação', dotColor: 'bg-amber-500',   accent: 'border-amber-500/50'   },
  { status: 'CORRECAO',   label: 'Em Correção',   dotColor: 'bg-red-500',     accent: 'border-red-500/50'     },
  { status: 'AGENDADO',   label: 'Agendado',      dotColor: 'bg-sky-500',     accent: 'border-sky-500/50'     },
  { status: 'CONCLUIDO',  label: 'Concluído',     dotColor: 'bg-violet-500',  accent: 'border-violet-500/50'  },
  { status: 'POSTADO',    label: 'Postado',       dotColor: 'bg-emerald-500', accent: 'border-emerald-500/50' },
  { status: 'CANCELADO',  label: 'Cancelado',     dotColor: 'bg-zinc-400',    accent: 'border-theme-border'   },
]

const TYPE_CONFIG: Record<ContentType, { label: string; dot: string; textColor: string }> = {
  stories: { label: 'Stories', dot: 'bg-pink-400',    textColor: 'text-pink-600 dark:text-pink-400'       },
  feed:    { label: 'Feed',    dot: 'bg-blue-400',    textColor: 'text-blue-600 dark:text-blue-400'        },
  acoes:   { label: 'Ação',    dot: 'bg-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400'  },
}

const STATUS_FIELD: Record<ContentType, 'stories_status' | 'feed_status' | 'acoes_status'> = {
  stories: 'stories_status',
  feed:    'feed_status',
  acoes:   'acoes_status',
}

function formatDay(entry: DayEntry): string {
  const day = new Date(entry.entry_date + 'T12:00:00').getDate()
  return `${String(day).padStart(2, '0')} · ${entry.dia_semana}`
}

function entriesToItems(entries: DayEntry[]): ContentItem[] {
  const items: ContentItem[] = []
  for (const entry of entries) {
    const pieces: [ContentType, string | null, DayEntryStatus, string | null][] = [
      ['stories', entry.stories_content, entry.stories_status, entry.stories_format],
      ['feed',    entry.feed_content,    entry.feed_status,    entry.feed_format   ],
      ['acoes',   entry.acoes_content,   entry.acoes_status,   entry.acoes_format  ],
    ]
    for (const [type, content, status, format] of pieces) {
      if (!content) continue   // só exibe cards com descrição preenchida
      const cfg = TYPE_CONFIG[type]
      items.push({ key: `${entry.id}-${type}`, entry, type, typeLabel: cfg.label, typeDot: cfg.dot, content, status, format })
    }
  }
  return items
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({
  item, onEdit, selected, onToggleSelect, selectionMode, onDragStart,
}: {
  item: ContentItem
  onEdit: (entry: DayEntry) => void
  selected: boolean
  onToggleSelect: (key: string) => void
  selectionMode: boolean
  onDragStart: (item: ContentItem) => void
}) {
  const typeCfg = TYPE_CONFIG[item.type]
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(item) }}
      onClick={() => selectionMode && onToggleSelect(item.key)}
      className={`group relative bg-theme-card border rounded-xl p-3 transition-all cursor-grab active:cursor-grabbing
        ${selected
          ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
          : 'border-theme-border hover:border-theme-border-strong'
        }
        ${selectionMode ? 'cursor-pointer' : ''}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggleSelect(item.key) }}
        className={`absolute top-2.5 left-2.5 w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0
          ${selected
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-theme-border bg-theme-surface opacity-0 group-hover:opacity-100'
          }
          ${selectionMode ? '!opacity-100' : ''}
        `}
      >
        {selected && <Check size={10} className="text-black" strokeWidth={3} />}
      </button>

      <div className={`transition-all ${selected || selectionMode ? 'pl-5' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.typeDot}`} />
            <span className={`text-xs font-medium ${typeCfg.textColor}`}>{item.typeLabel}</span>
          </div>
          <span className="text-xs text-theme-muted">{formatDay(item.entry)}</span>
        </div>
        <p className="text-xs text-theme-secondary leading-relaxed line-clamp-3 min-h-[2.5rem]">
          {item.content ?? <span className="text-theme-muted italic">Sem descrição</span>}
        </p>
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-theme-border">
          {item.format
            ? <span className="text-xs bg-theme-surface text-theme-muted px-2 py-0.5 rounded">{item.format}</span>
            : <span />}
          <button
            onClick={e => { e.stopPropagation(); onEdit(item.entry) }}
            className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-emerald-500 transition-all p-0.5 rounded"
          >
            <Pencil size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({
  count, onChangeStatus, onClear, saving,
}: {
  count: number
  onChangeStatus: (status: DayEntryStatus) => void
  onClear: () => void
  saving: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-theme-card border border-theme-border-strong rounded-2xl shadow-2xl px-5 py-3">
      <span className="text-sm font-semibold text-theme-primary whitespace-nowrap">
        {count} {count === 1 ? 'item selecionado' : 'itens selecionados'}
      </span>
      <div className="w-px h-5 bg-theme-border" />
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Mover para'}
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute bottom-full mb-2 left-0 bg-theme-card border border-theme-border rounded-xl shadow-xl py-1.5 min-w-[160px] z-10">
            {COLUMNS.filter(c => c.status !== 'CANCELADO').map(col => (
              <button
                key={col.status}
                onClick={() => { setOpen(false); onChangeStatus(col.status) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-theme-secondary hover:bg-theme-surface hover:text-theme-primary transition-colors"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
                {col.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onClear}
        className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-lg transition-colors"
        title="Cancelar seleção"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── Main KanbanView ──────────────────────────────────────────────────────────
export default function KanbanView({ entries, onRefresh }: Props) {
  const [editingEntry,   setEditingEntry]   = useState<DayEntry | null>(null)
  const [selected,       setSelected]       = useState<Set<string>>(new Set())
  const [saving,         setSaving]         = useState(false)
  const [filterStatuses, setFilterStatuses] = useState<DayEntryStatus[]>([])
  const [filterDate,     setFilterDate]     = useState<string>('')
  const [dragItem,       setDragItem]       = useState<ContentItem | null>(null)
  const [dragOverCol,    setDragOverCol]    = useState<DayEntryStatus | null>(null)

  const allItems = useMemo(() => entriesToItems(entries), [entries])

  const availableDates = useMemo(() => {
    const seen = new Set<string>()
    const dates: string[] = []
    for (const e of entries) { if (!seen.has(e.entry_date)) { seen.add(e.entry_date); dates.push(e.entry_date) } }
    return dates.sort()
  }, [entries])

  const filteredItems = useMemo(() => {
    let result = allItems
    if (filterStatuses.length > 0)
      result = result.filter(i => i.status && filterStatuses.includes(i.status))
    if (filterDate)
      result = result.filter(i => i.entry.entry_date === filterDate)
    return result
  }, [allItems, filterStatuses, filterDate])

  const byStatus = useMemo(() => {
    const map = new Map<DayEntryStatus, ContentItem[]>()
    for (const col of COLUMNS) map.set(col.status, [])
    for (const item of filteredItems) {
      const key = item.status ?? 'A_FAZER'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [filteredItems])

  const visibleColumns = COLUMNS.filter(col => {
    if (filterStatuses.length > 0) return filterStatuses.includes(col.status)
    return col.status === 'CANCELADO' ? (byStatus.get('CANCELADO')?.length ?? 0) > 0 : true
  })

  const selectionMode = selected.size > 0

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleStatus = (s: DayEntryStatus) =>
    setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleBulkStatus = async (newStatus: DayEntryStatus) => {
    setSaving(true)
    const supabase = createDataClient()
    const selectedItems = filteredItems.filter(i => selected.has(i.key))
    await Promise.all(
      selectedItems.map(item =>
        supabase
          .from('day_entries')
          .update({ [STATUS_FIELD[item.type]]: newStatus, updated_at: new Date().toISOString() })
          .eq('id', item.entry.id)
      )
    )
    setSaving(false)
    setSelected(new Set())
    onRefresh()
  }

  // ── Drag and drop ──
  const handleDrop = async (targetStatus: DayEntryStatus) => {
    setDragOverCol(null)
    if (!dragItem || dragItem.status === targetStatus) { setDragItem(null); return }
    const supabase = createDataClient()
    await supabase
      .from('day_entries')
      .update({ [STATUS_FIELD[dragItem.type]]: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', dragItem.entry.id)
    setDragItem(null)
    onRefresh()
  }

  const hasFilters = filterStatuses.length > 0 || filterDate

  return (
    <>
      {/* ── Barra de filtros ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-theme-muted">Status:</span>
          {COLUMNS.map(col => {
            const active = filterStatuses.includes(col.status)
            return (
              <button
                key={col.status}
                onClick={() => toggleStatus(col.status)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                  ${active
                    ? 'bg-theme-primary text-theme-bg border-theme-primary'
                    : 'bg-theme-surface text-theme-secondary border-theme-border hover:border-theme-border-strong'
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                {col.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-theme-muted">Data:</span>
          <select
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="text-xs bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1.5 text-theme-secondary focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">Todas as datas</option>
            {availableDates.map(d => {
              const dt   = new Date(d + 'T12:00:00')
              const day  = String(dt.getDate()).padStart(2, '0')
              const week = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dt.getDay()]
              return <option key={d} value={d}>{day} · {week}</option>
            })}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatuses([]); setFilterDate('') }}
              className="text-xs text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-1"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Colunas ── */}
      <div className="flex gap-3 overflow-x-auto pb-16 items-start">
        {visibleColumns.map(col => {
          const colItems = byStatus.get(col.status) ?? []
          const selectedInCol = colItems.filter(i => selected.has(i.key)).length
          const isDragTarget = dragOverCol === col.status && dragItem?.status !== col.status
          return (
            <div
              key={col.status}
              className="flex-shrink-0 w-[220px] flex flex-col"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.status) }}
              onDragLeave={() => setDragOverCol(prev => prev === col.status ? null : prev)}
              onDrop={() => handleDrop(col.status)}
            >
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl bg-theme-card border border-b-0 transition-colors
                ${isDragTarget ? 'bg-emerald-500/10 border-emerald-500/60' : col.accent}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
                <span className="text-xs font-medium text-theme-secondary flex-1">{col.label}</span>
                <div className="flex items-center gap-1.5">
                  {selectedInCol > 0 && (
                    <span className="text-[10px] text-emerald-500 font-bold">{selectedInCol}✓</span>
                  )}
                  {colItems.length > 0 && (
                    <span className="text-xs text-theme-muted font-mono">{colItems.length}</span>
                  )}
                </div>
              </div>
              <div className={`flex-1 rounded-b-xl border p-2 space-y-2 min-h-[120px] transition-colors
                ${isDragTarget
                  ? 'bg-emerald-500/5 border-emerald-500/60 border-dashed'
                  : `bg-theme-bg/50 ${col.accent}`
                }`}>
                {isDragTarget && (
                  <div className="flex items-center justify-center h-10 text-xs text-emerald-500 font-medium">
                    Soltar aqui
                  </div>
                )}
                {colItems.length === 0 && !isDragTarget
                  ? <div className="flex items-center justify-center h-20"><span className="text-xs text-theme-muted">—</span></div>
                  : colItems.map(item => (
                      <KanbanCard
                        key={item.key}
                        item={item}
                        onEdit={setEditingEntry}
                        selected={selected.has(item.key)}
                        onToggleSelect={toggleSelect}
                        selectionMode={selectionMode}
                        onDragStart={setDragItem}
                      />
                    ))
                }
              </div>
            </div>
          )
        })}
      </div>

      {selectionMode && (
        <BulkActionBar
          count={selected.size}
          onChangeStatus={handleBulkStatus}
          onClear={() => setSelected(new Set())}
          saving={saving}
        />
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); onRefresh() }}
        />
      )}
    </>
  )
}
