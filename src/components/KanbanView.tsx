'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import EditEntryModal from './EditEntryModal'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

type ContentType = 'stories' | 'feed' | 'acoes'

type ContentItem = {
  key: string; entry: DayEntry; type: ContentType
  typeLabel: string; typeDot: string; content: string | null; status: DayEntryStatus; format: string | null
}

type Props = { entries: DayEntry[]; onRefresh: () => void }

type Column = { status: DayEntryStatus; label: string; dotColor: string; accent: string }

const COLUMNS: Column[] = [
  { status: 'A_FAZER',    label: 'A Fazer',       dotColor: 'bg-zinc-500',    accent: 'border-theme-border'    },
  { status: 'AGUARDANDO', label: 'Ag. Aprovação',  dotColor: 'bg-amber-500',   accent: 'border-amber-500/50'    },
  { status: 'ANDAMENTO',  label: 'Em Andamento',   dotColor: 'bg-blue-500',    accent: 'border-blue-500/50'     },
  { status: 'VALIDACAO',  label: 'Em Validação',   dotColor: 'bg-purple-500',  accent: 'border-purple-500/50'   },
  { status: 'CORRECAO',   label: 'Em Correção',    dotColor: 'bg-red-500',     accent: 'border-red-500/50'      },
  { status: 'POSTADO',    label: 'Postado',        dotColor: 'bg-emerald-500', accent: 'border-emerald-500/50'  },
  { status: 'CANCELADO',  label: 'Cancelado',      dotColor: 'bg-zinc-400',    accent: 'border-theme-border'    },
]

const TYPE_CONFIG: Record<ContentType, { label: string; dot: string; textColor: string }> = {
  stories: { label: 'Stories', dot: 'bg-pink-400',    textColor: 'text-pink-600 dark:text-pink-400'       },
  feed:    { label: 'Feed',    dot: 'bg-blue-400',    textColor: 'text-blue-600 dark:text-blue-400'        },
  acoes:   { label: 'Ação',    dot: 'bg-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400'  },
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
      if (!status && !content) continue
      const cfg = TYPE_CONFIG[type]
      items.push({ key: `${entry.id}-${type}`, entry, type, typeLabel: cfg.label, typeDot: cfg.dot, content, status, format })
    }
  }
  return items
}

function KanbanCard({ item, onEdit }: { item: ContentItem; onEdit: (entry: DayEntry) => void }) {
  const typeCfg = TYPE_CONFIG[item.type]
  return (
    <div className="group bg-theme-card border border-theme-border rounded-xl p-3 hover:border-theme-border-strong transition-colors">
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
        <button onClick={() => onEdit(item.entry)}
          className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-emerald-500 transition-all p-0.5 rounded">
          <Pencil size={11} />
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({ column, items, onEdit }: { column: Column; items: ContentItem[]; onEdit: (e: DayEntry) => void }) {
  return (
    <div className="flex-shrink-0 w-[220px] flex flex-col">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl bg-theme-card border border-b-0 ${column.accent}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${column.dotColor}`} />
        <span className="text-xs font-medium text-theme-secondary flex-1">{column.label}</span>
        {items.length > 0 && <span className="text-xs text-theme-muted font-mono">{items.length}</span>}
      </div>
      <div className={`flex-1 rounded-b-xl border ${column.accent} bg-theme-bg/50 p-2 space-y-2 min-h-[120px]`}>
        {items.length === 0
          ? <div className="flex items-center justify-center h-20"><span className="text-xs text-theme-muted">—</span></div>
          : items.map(item => <KanbanCard key={item.key} item={item} onEdit={onEdit} />)}
      </div>
    </div>
  )
}

export default function KanbanView({ entries, onRefresh }: Props) {
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)
  const items = entriesToItems(entries)

  const byStatus = new Map<DayEntryStatus, ContentItem[]>()
  for (const col of COLUMNS) byStatus.set(col.status, [])
  for (const item of items) {
    const key = item.status ?? 'A_FAZER'
    if (!byStatus.has(key)) byStatus.set(key, [])
    byStatus.get(key)!.push(item)
  }

  const visibleColumns = COLUMNS.filter(col =>
    col.status === 'CANCELADO' ? (byStatus.get('CANCELADO')?.length ?? 0) > 0 : true
  )

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {visibleColumns.map(col => (
          <KanbanColumn key={col.status ?? 'null'} column={col}
            items={byStatus.get(col.status) ?? []} onEdit={setEditingEntry} />
        ))}
      </div>
      {editingEntry && (
        <EditEntryModal entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => { setEditingEntry(null); onRefresh() }} />
      )}
    </>
  )
}
