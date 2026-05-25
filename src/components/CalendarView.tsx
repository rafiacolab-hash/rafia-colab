'use client'

import { useState, type ReactNode } from 'react'
import { X, Pencil, ExternalLink, FileText, ImageIcon, Zap } from 'lucide-react'
import EditEntryModal from './EditEntryModal'
import StatusBadge from './StatusBadge'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

/* ─── Dot colors (calendar grid) ──────────────────────────────────────────── */
const STATUS_DOT: Record<NonNullable<DayEntryStatus>, string> = {
  POSTADO:    'bg-emerald-400', ANDAMENTO:  'bg-blue-400',
  VALIDACAO:  'bg-purple-400',  CORRECAO:   'bg-red-400',
  AGUARDANDO: 'bg-amber-400',   A_FAZER:    'bg-zinc-500',
  CANCELADO:  'bg-zinc-400',
}

type Props = { entries: DayEntry[]; monthRef: string; onRefresh: () => void }

type CalendarCell = {
  date: Date
  dateStr: string
  isCurrentMonth: boolean
  entry: DayEntry | null
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/* ─── Calendar grid builder ────────────────────────────────────────────────── */
function buildCalendarCells(monthRef: string, entries: DayEntry[]): CalendarCell[][] {
  const [year, month] = monthRef.split('-').map(Number)
  const entryMap = new Map<string, DayEntry>()
  for (const e of entries) entryMap.set(e.entry_date, e)

  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))

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

/* ─── Status dot ───────────────────────────────────────────────────────────── */
function StatusDot({ status, title }: { status: DayEntryStatus; title: string }) {
  if (!status) return <span className="w-2 h-2 rounded-full bg-theme-surface" title={title} />
  return <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} title={`${title}: ${status}`} />
}

/* ─── Calendar cell ────────────────────────────────────────────────────────── */
function Cell({ cell, onSelect }: { cell: CalendarCell; onSelect: (e: DayEntry) => void }) {
  const { date, isCurrentMonth, entry } = cell
  const day = date.getDate()
  const isToday = cell.dateStr === new Date().toISOString().split('T')[0]
  const hasContent = !!(entry?.stories_status || entry?.feed_status || entry?.acoes_status ||
    entry?.stories_content || entry?.feed_content || entry?.acoes_content)

  return (
    <div
      onClick={() => entry && onSelect(entry)}
      className={`group relative min-h-[80px] p-2 border-b border-r border-theme-border transition-colors
        ${isCurrentMonth ? 'bg-theme-bg' : 'bg-theme-surface/20'}
        ${entry ? 'cursor-pointer hover:bg-theme-surface/40' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? 'bg-emerald-500 text-black font-bold' : ''}
          ${!isToday && isCurrentMonth ? 'text-theme-primary' : ''}
          ${!isCurrentMonth ? 'text-theme-muted' : ''}`}>
          {day}
        </span>
        {hasContent && isCurrentMonth && (
          <span className="w-1.5 h-1.5 rounded-full bg-theme-raised group-hover:bg-emerald-400 transition-colors" />
        )}
      </div>

      {isCurrentMonth && entry && (
        <div className="flex items-center gap-1 flex-wrap">
          <StatusDot status={entry.stories_status} title="Stories" />
          <StatusDot status={entry.feed_status}    title="Feed"    />
          <StatusDot status={entry.acoes_status}   title="Ação"    />
        </div>
      )}
    </div>
  )
}

/* ─── Format section inside the panel ─────────────────────────────────────── */
type FormatSectionProps = {
  label: string
  icon: ReactNode
  color: string         // tailwind text color class
  borderColor: string   // tailwind border color class
  bgColor: string
  status: DayEntryStatus
  content: string | null
  format: string | null
}

function FormatSection({ label, icon, color, borderColor, bgColor, status, content, format }: FormatSectionProps) {
  const isEmpty = !status && !content && !format
  if (isEmpty) return null

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 space-y-2.5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
          {icon}
          {label}
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      {/* Format tag */}
      {format && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-theme-surface border border-theme-border rounded-md text-theme-muted">
          <FileText size={10} />
          {format}
        </span>
      )}

      {/* Content */}
      {content && (
        <p className="text-sm text-theme-secondary leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      )}

      {/* Empty state */}
      {!content && !format && status && (
        <p className="text-xs text-theme-muted italic">Sem conteúdo descrito.</p>
      )}
    </div>
  )
}

/* ─── Day detail panel ─────────────────────────────────────────────────────── */
function DayDetailPanel({
  entry,
  onClose,
  onEdit,
}: {
  entry: DayEntry
  onClose: () => void
  onEdit: () => void
}) {
  const [d, month, year] = (() => {
    const dt = new Date(entry.entry_date + 'T12:00:00')
    return [dt.getDate(), dt.getMonth(), dt.getFullYear()]
  })()

  const weekDay = entry.dia_semana || WEEK_DAYS[new Date(entry.entry_date + 'T12:00:00').getDay()]
  const hasExtra = !!(entry.legenda_copy || entry.arte_link || entry.observacoes)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] max-w-full z-40 bg-theme-card border-l border-theme-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-theme-border flex-shrink-0">
          <div>
            <p className="text-xs text-theme-muted uppercase tracking-widest font-medium mb-1">
              {weekDay} · {MONTH_NAMES[month]} {year}
            </p>
            <h2 className="text-3xl font-bold text-theme-primary">{d}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition-colors"
            >
              <Pencil size={12} />
              Editar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">

          <FormatSection
            label="Stories"
            icon={<ImageIcon size={14} />}
            color="text-pink-500 dark:text-pink-400"
            borderColor="border-pink-500/20"
            bgColor="bg-pink-500/5"
            status={entry.stories_status}
            content={entry.stories_content}
            format={entry.stories_format}
          />

          <FormatSection
            label="Feed"
            icon={<FileText size={14} />}
            color="text-blue-500 dark:text-blue-400"
            borderColor="border-blue-500/20"
            bgColor="bg-blue-500/5"
            status={entry.feed_status}
            content={entry.feed_content}
            format={entry.feed_format}
          />

          <FormatSection
            label="Ação"
            icon={<Zap size={14} />}
            color="text-emerald-500 dark:text-emerald-400"
            borderColor="border-emerald-500/20"
            bgColor="bg-emerald-500/5"
            status={entry.acoes_status}
            content={entry.acoes_content}
            format={entry.acoes_format}
          />

          {/* Extra fields */}
          {hasExtra && (
            <div className="rounded-xl border border-theme-border bg-theme-surface/40 p-4 space-y-3 mt-1">
              {entry.legenda_copy && (
                <div>
                  <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-1">Legenda / Copy</p>
                  <p className="text-sm text-theme-secondary leading-relaxed whitespace-pre-wrap">{entry.legenda_copy}</p>
                </div>
              )}
              {entry.arte_link && (
                <div>
                  <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-1">Arte</p>
                  <a
                    href={entry.arte_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <ExternalLink size={13} />
                    Ver arte
                  </a>
                </div>
              )}
              {entry.observacoes && (
                <div>
                  <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-sm text-theme-secondary leading-relaxed whitespace-pre-wrap">{entry.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!entry.stories_status && !entry.feed_status && !entry.acoes_status &&
           !entry.stories_content && !entry.feed_content && !entry.acoes_content && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-theme-surface flex items-center justify-center mb-3">
                <FileText size={18} className="text-theme-muted" />
              </div>
              <p className="text-sm text-theme-muted">Nenhum conteúdo planejado para este dia.</p>
              <button
                onClick={onEdit}
                className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-lg transition-colors"
              >
                Adicionar conteúdo
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─── Main export ──────────────────────────────────────────────────────────── */
export default function CalendarView({ entries, monthRef, onRefresh }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<DayEntry | null>(null)
  const [editingEntry,  setEditingEntry]  = useState<DayEntry | null>(null)
  const weeks = buildCalendarCells(monthRef, entries)

  const openEdit = () => {
    if (selectedEntry) {
      setEditingEntry(selectedEntry)
    }
  }

  return (
    <>
      <div className="bg-theme-card rounded-xl border border-theme-border overflow-hidden">
        {/* Legenda */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-theme-border bg-theme-card flex-wrap">
          <span className="text-xs text-theme-muted mr-1">Formatos:</span>
          {([
            ['Stories', 'bg-pink-400'],
            ['Feed',    'bg-blue-400'],
            ['Ação',    'bg-emerald-400'],
          ] as const).map(([l, c]) => (
            <span key={l} className="flex items-center gap-1 text-xs text-theme-secondary">
              <span className={`w-2 h-2 rounded-full ${c}`} />{l}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-3 text-xs text-theme-muted">
            {([
              ['Postado',    'bg-emerald-400'],
              ['Andamento',  'bg-blue-400'],
              ['Validação',  'bg-purple-400'],
              ['Correção',   'bg-red-400'],
              ['Aguardando', 'bg-amber-400'],
              ['A Fazer',    'bg-zinc-500'],
            ] as const).map(([l, c]) => (
              <span key={l} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${c}`} />{l}
              </span>
            ))}
          </span>
        </div>

        {/* Cabeçalho dias */}
        <div className="grid grid-cols-7 border-b border-theme-border">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-theme-muted">{d}</div>
          ))}
        </div>

        {/* Grade */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(cell => (
              <Cell key={cell.dateStr} cell={cell} onSelect={setSelectedEntry} />
            ))}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedEntry && !editingEntry && (
        <DayDetailPanel
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={openEdit}
        />
      )}

      {/* Edit modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null)
            setSelectedEntry(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
