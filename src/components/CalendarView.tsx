'use client'

import { useState } from 'react'
import EditEntryModal from './EditEntryModal'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

// ─── Cor do dot por status ─────────────────────────────────────────────────────
const STATUS_DOT: Record<NonNullable<DayEntryStatus>, string> = {
  POSTADO:    'bg-emerald-400',
  ANDAMENTO:  'bg-blue-400',
  VALIDACAO:  'bg-purple-400',
  CORRECAO:   'bg-red-400',
  AGUARDANDO: 'bg-amber-400',
  A_FAZER:    'bg-zinc-500',
  CANCELADO:  'bg-zinc-700',
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Props = {
  entries: DayEntry[]
  monthRef: string   // 'YYYY-MM'
  onRefresh: () => void
}

type CalendarCell = {
  date: Date
  dateStr: string     // YYYY-MM-DD
  isCurrentMonth: boolean
  entry: DayEntry | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function buildCalendarCells(monthRef: string, entries: DayEntry[]): CalendarCell[][] {
  const [year, month] = monthRef.split('-').map(Number)

  // Mapa rápido: dateStr → entry
  const entryMap = new Map<string, DayEntry>()
  for (const e of entries) entryMap.set(e.entry_date, e)

  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)

  // Início da grade: domingo da semana do primeiro dia
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  // Fim da grade: sábado da semana do último dia (mínimo 6 semanas)
  const endDate = new Date(lastDay)
  const remaining = 6 - lastDay.getDay()
  endDate.setDate(lastDay.getDate() + remaining)

  const weeks: CalendarCell[][] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const week: CalendarCell[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0]
      week.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth: current.getMonth() === month - 1,
        entry: entryMap.get(dateStr) ?? null,
      })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

// ─── Dot de status ─────────────────────────────────────────────────────────────
function StatusDot({ status, title }: { status: DayEntryStatus; title: string }) {
  if (!status) return <span className="w-2 h-2 rounded-full bg-zinc-800" title={title} />
  return (
    <span
      className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
      title={`${title}: ${status}`}
    />
  )
}

// ─── Célula do calendário ──────────────────────────────────────────────────────
function CalendarCell({
  cell,
  onEdit,
}: {
  cell: CalendarCell
  onEdit: (entry: DayEntry) => void
}) {
  const { date, isCurrentMonth, entry } = cell
  const day = date.getDate()
  const isToday = cell.dateStr === new Date().toISOString().split('T')[0]

  const hasContent = !!(
    entry?.stories_status || entry?.feed_status || entry?.acoes_status ||
    entry?.stories_content || entry?.feed_content || entry?.acoes_content
  )

  return (
    <div
      onClick={() => entry && onEdit(entry)}
      className={`
        group relative min-h-[80px] p-2 border-b border-r border-zinc-800 transition-colors
        ${isCurrentMonth ? 'bg-zinc-950' : 'bg-zinc-900/30'}
        ${entry ? 'cursor-pointer hover:bg-zinc-800/60' : 'cursor-default'}
      `}
    >
      {/* Número do dia */}
      <div className="flex items-start justify-between mb-2">
        <span className={`
          text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? 'bg-emerald-500 text-black font-bold' : ''}
          ${!isToday && isCurrentMonth ? 'text-zinc-300' : ''}
          ${!isCurrentMonth ? 'text-zinc-700' : ''}
        `}>
          {day}
        </span>
        {/* Indicador de conteúdo preenchido */}
        {hasContent && isCurrentMonth && (
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-zinc-400 transition-colors" />
        )}
      </div>

      {/* Dots de status (só para dias do mês atual com entrada) */}
      {isCurrentMonth && entry && (
        <div className="flex items-center gap-1 flex-wrap">
          <StatusDot status={entry.stories_status} title="Stories" />
          <StatusDot status={entry.feed_status}    title="Feed"    />
          <StatusDot status={entry.acoes_status}   title="Ação"    />
        </div>
      )}

      {/* Preview do conteúdo no hover */}
      {isCurrentMonth && entry && (entry.stories_content || entry.feed_content || entry.acoes_content) && (
        <div className="absolute left-0 top-full z-20 hidden group-hover:block w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3 space-y-1.5 text-xs pointer-events-none">
          {entry.stories_content && (
            <div>
              <span className="text-pink-400 font-medium">Stories</span>
              <p className="text-zinc-400 line-clamp-2 mt-0.5">{entry.stories_content}</p>
            </div>
          )}
          {entry.feed_content && (
            <div>
              <span className="text-blue-400 font-medium">Feed</span>
              <p className="text-zinc-400 line-clamp-2 mt-0.5">{entry.feed_content}</p>
            </div>
          )}
          {entry.acoes_content && (
            <div>
              <span className="text-emerald-400 font-medium">Ação</span>
              <p className="text-zinc-400 line-clamp-2 mt-0.5">{entry.acoes_content}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CalendarView ──────────────────────────────────────────────────────────────
export default function CalendarView({ entries, monthRef, onRefresh }: Props) {
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)

  const weeks = buildCalendarCells(monthRef, entries)

  return (
    <>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Legenda de status */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 flex-wrap">
          <span className="text-xs text-zinc-600 mr-1">Dots:</span>
          {([
            ['Stories',   'bg-pink-400'   ],
            ['Feed',      'bg-blue-400'   ],
            ['Ação',      'bg-emerald-400'],
          ] as const).map(([label, cls]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${cls}`} />{label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-3 text-xs text-zinc-600">
            {([
              ['Postado',    'bg-emerald-400'],
              ['Andamento',  'bg-blue-400'   ],
              ['Validação',  'bg-purple-400' ],
              ['Correção',   'bg-red-400'    ],
              ['Aguardando', 'bg-amber-400'  ],
              ['A Fazer',    'bg-zinc-500'   ],
            ] as const).map(([label, cls]) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${cls}`} />{label}
              </span>
            ))}
          </span>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-zinc-500">
              {d}
            </div>
          ))}
        </div>

        {/* Grade de semanas */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(cell => (
              <CalendarCell
                key={cell.dateStr}
                cell={cell}
                onEdit={setEditingEntry}
              />
            ))}
          </div>
        ))}
      </div>

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
