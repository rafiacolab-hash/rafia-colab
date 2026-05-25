'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, Pencil, Check, Loader2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EditEntryModal from './EditEntryModal'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

type Props = { entries: DayEntry[]; onRefresh: () => void }

/* ─── Status options ───────────────────────────────────────────────────────── */
const STATUS_OPTIONS: { value: DayEntryStatus; label: string; dot: string }[] = [
  { value: 'A_FAZER',    label: 'A Fazer',       dot: 'bg-zinc-500'   },
  { value: 'AGUARDANDO', label: 'Ag. Aprovação', dot: 'bg-amber-400'  },
  { value: 'ANDAMENTO',  label: 'Em Andamento',  dot: 'bg-blue-400'   },
  { value: 'VALIDACAO',  label: 'Em Validação',  dot: 'bg-purple-400' },
  { value: 'CORRECAO',   label: 'Em Correção',   dot: 'bg-red-400'    },
  { value: 'POSTADO',    label: 'Postado',       dot: 'bg-emerald-400'},
  { value: 'CANCELADO',  label: 'Cancelado',     dot: 'bg-zinc-400'   },
]

/* ─── Save a single field to Supabase ──────────────────────────────────────── */
async function saveField(entryId: string, field: string, value: string | null) {
  const supabase = createDataClient()
  const { error } = await supabase
    .from('day_entries')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', entryId)
  if (error) throw error
}

/* ─── Inline status selector ───────────────────────────────────────────────── */
function InlineStatus({
  status, field, entryId, onSaved,
}: {
  status: DayEntryStatus
  field: string
  entryId: string
  onSaved: (value: DayEntryStatus) => void
}) {
  const [open, setSaving_open] = useState(false)
  const [saving, setSaving]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSaving_open(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = async (value: DayEntryStatus) => {
    if (value === status) { setSaving_open(false); return }
    setSaving_open(false)
    setSaving(true)
    try {
      await saveField(entryId, field, value)
      onSaved(value)
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setSaving_open(o => !o)}
        disabled={saving}
        className={`flex items-center gap-1.5 transition-opacity ${saving ? 'opacity-50' : ''}`}
        title="Alterar status"
      >
        {saving
          ? <Loader2 size={12} className="animate-spin text-theme-muted" />
          : status
            ? <StatusBadge status={status} />
            : <span className="text-xs text-theme-muted border border-dashed border-theme-border rounded-md px-2 py-0.5 hover:border-theme-border-strong transition-colors">
                + Status
              </span>
        }
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-theme-card border border-theme-border rounded-xl shadow-2xl p-1.5 min-w-[165px]">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value ?? 'none'}
              onClick={() => select(opt.value)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-theme-surface transition-colors flex items-center gap-2.5 ${
                status === opt.value ? 'bg-theme-surface/80' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
              <span className="text-theme-secondary flex-1">{opt.label}</span>
              {status === opt.value && <Check size={11} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Inline content editor ─────────────────────────────────────────────────── */
function InlineContent({
  content, field, entryId, onSaved,
}: {
  content: string | null
  field: string
  entryId: string
  onSaved: (value: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(content ?? '')
  const [saving,  setSaving]  = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft when content prop changes (e.g., after external refresh)
  useEffect(() => { if (!editing) setDraft(content ?? '') }, [content, editing])

  // Focus + cursor at end when opening
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus()
      const len = taRef.current.value.length
      taRef.current.setSelectionRange(len, len)
      // Auto-resize
      taRef.current.style.height = 'auto'
      taRef.current.style.height = taRef.current.scrollHeight + 'px'
    }
  }, [editing])

  const save = async () => {
    setEditing(false)
    const val = draft.trim() || null
    if (val === content) return
    setSaving(true)
    try {
      await saveField(entryId, field, val)
      onSaved(val)
    } catch {
      setDraft(content ?? '') // Revert on error
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = e.target.scrollHeight + 'px'
        }}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Escape') { setEditing(false); setDraft(content ?? '') }
          if (e.key === 'Enter' && e.metaKey) save()
        }}
        placeholder="Descreva o conteúdo... (⌘+Enter para salvar)"
        className="w-full bg-theme-surface border border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-theme-primary resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all min-h-[72px]"
        rows={3}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-text rounded-lg px-3 py-2 min-h-[40px] hover:bg-theme-surface/60 border border-transparent hover:border-theme-border transition-all ${saving ? 'opacity-50' : ''}`}
      title="Clique para editar"
    >
      {saving
        ? <span className="flex items-center gap-1.5 text-xs text-theme-muted"><Loader2 size={11} className="animate-spin" />Salvando...</span>
        : content
          ? <p className="text-sm text-theme-primary leading-relaxed whitespace-pre-wrap">{content}</p>
          : <p className="text-xs text-theme-muted italic">Clique para adicionar conteúdo...</p>
      }
    </div>
  )
}

/* ─── Main component ────────────────────────────────────────────────────────── */
export default function ListaView({ entries, onRefresh }: Props) {
  const [expanded,     setExpanded]     = useState<Record<string, boolean>>({})
  const [editingEntry, setEditingEntry] = useState<DayEntry | null>(null)

  // Local copy for optimistic updates
  const [local, setLocal] = useState<DayEntry[]>(entries)
  useEffect(() => { setLocal(entries) }, [entries])

  const patch = (id: string, update: Partial<DayEntry>) =>
    setLocal(prev => prev.map(e => e.id === id ? { ...e, ...update } : e))

  return (
    <>
      <div className="bg-theme-card rounded-xl border border-theme-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_60px_1fr_1fr_1fr_140px_36px] gap-2 px-4 py-3 bg-theme-surface/50 border-b border-theme-border">
          <div />
          <span className="text-theme-muted text-xs font-medium">Dia</span>
          <span className="text-theme-muted text-xs font-medium">Stories</span>
          <span className="text-theme-muted text-xs font-medium">Feed</span>
          <span className="text-theme-muted text-xs font-medium">Ação</span>
          <span className="text-theme-muted text-xs font-medium">Status</span>
          <div />
        </div>

        {local.map(entry => {
          const isOpen = expanded[entry.id]
          return (
            <div key={entry.id} className="border-b border-theme-border last:border-0">
              {/* Collapsed row */}
              <div className="grid grid-cols-[40px_60px_1fr_1fr_1fr_140px_36px] gap-2 px-4 py-3 hover:bg-theme-surface/30 items-center transition-colors">
                <button onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}
                  className="text-theme-muted hover:text-theme-secondary transition-colors">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div className="cursor-pointer" onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                  <span className="text-theme-primary text-sm font-medium">
                    {new Date(entry.entry_date + 'T12:00:00').getDate()}
                  </span>
                  <span className="text-theme-muted text-xs ml-1">{entry.dia_semana}</span>
                </div>

                <span className="text-theme-secondary text-xs truncate cursor-pointer"
                  onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                  {entry.stories_content ?? <span className="text-theme-muted">—</span>}
                </span>
                <span className="text-theme-secondary text-xs truncate cursor-pointer"
                  onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                  {entry.feed_content ?? <span className="text-theme-muted">—</span>}
                </span>
                <span className="text-theme-secondary text-xs truncate cursor-pointer"
                  onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                  {entry.acoes_content ?? <span className="text-theme-muted">—</span>}
                </span>

                <div className="flex gap-1 flex-wrap cursor-pointer"
                  onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                  {entry.stories_status && <StatusBadge status={entry.stories_status} />}
                  {entry.feed_status    && <StatusBadge status={entry.feed_status} />}
                  {entry.acoes_status   && <StatusBadge status={entry.acoes_status} />}
                </div>

                <button onClick={() => setEditingEntry(entry)}
                  className="text-theme-muted hover:text-emerald-500 transition-colors p-1 rounded" title="Editar completo">
                  <Pencil size={13} />
                </button>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div className="px-4 pb-5 pt-1 bg-theme-surface/10 border-t border-theme-border/50">
                  {/* Hint */}
                  <p className="text-[11px] text-theme-muted mb-3 px-1">
                    Clique no status para alterar · Clique no conteúdo para editar
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Stories */}
                    <div className="bg-theme-card rounded-xl p-3.5 border border-pink-500/15 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-pink-500 dark:text-pink-400">Stories</span>
                        <InlineStatus
                          status={entry.stories_status}
                          field="stories_status"
                          entryId={entry.id}
                          onSaved={v => patch(entry.id, { stories_status: v })}
                        />
                      </div>
                      {entry.stories_format && (
                        <span className="inline-block text-[11px] bg-theme-surface text-theme-muted px-2 py-0.5 rounded-md border border-theme-border">
                          {entry.stories_format}
                        </span>
                      )}
                      <InlineContent
                        content={entry.stories_content}
                        field="stories_content"
                        entryId={entry.id}
                        onSaved={v => patch(entry.id, { stories_content: v })}
                      />
                    </div>

                    {/* Feed */}
                    <div className="bg-theme-card rounded-xl p-3.5 border border-blue-500/15 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-500 dark:text-blue-400">Feed</span>
                        <InlineStatus
                          status={entry.feed_status}
                          field="feed_status"
                          entryId={entry.id}
                          onSaved={v => patch(entry.id, { feed_status: v })}
                        />
                      </div>
                      {entry.feed_format && (
                        <span className="inline-block text-[11px] bg-theme-surface text-theme-muted px-2 py-0.5 rounded-md border border-theme-border">
                          {entry.feed_format}
                        </span>
                      )}
                      <InlineContent
                        content={entry.feed_content}
                        field="feed_content"
                        entryId={entry.id}
                        onSaved={v => patch(entry.id, { feed_content: v })}
                      />
                    </div>

                    {/* Ação */}
                    <div className="bg-theme-card rounded-xl p-3.5 border border-emerald-500/15 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">Ação</span>
                        <InlineStatus
                          status={entry.acoes_status}
                          field="acoes_status"
                          entryId={entry.id}
                          onSaved={v => patch(entry.id, { acoes_status: v })}
                        />
                      </div>
                      {entry.acoes_format && (
                        <span className="inline-block text-[11px] bg-theme-surface text-theme-muted px-2 py-0.5 rounded-md border border-theme-border">
                          {entry.acoes_format}
                        </span>
                      )}
                      <InlineContent
                        content={entry.acoes_content}
                        field="acoes_content"
                        entryId={entry.id}
                        onSaved={v => patch(entry.id, { acoes_content: v })}
                      />
                    </div>
                  </div>

                  {/* Extra fields */}
                  {(entry.legenda_copy || entry.arte_link || entry.observacoes) && (
                    <div className="bg-theme-card rounded-xl p-3.5 border border-theme-border space-y-2.5 mb-3">
                      {entry.legenda_copy && (
                        <div>
                          <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Legenda</span>
                          <p className="text-sm text-theme-secondary mt-1 leading-relaxed">{entry.legenda_copy}</p>
                        </div>
                      )}
                      {entry.arte_link && (
                        <div>
                          <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Arte/Link</span>
                          <a href={entry.arte_link} target="_blank" rel="noreferrer"
                            className="text-sm text-emerald-500 hover:text-emerald-400 hover:underline block mt-1 truncate">
                            {entry.arte_link}
                          </a>
                        </div>
                      )}
                      {entry.observacoes && (
                        <div>
                          <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Observações</span>
                          <p className="text-sm text-theme-secondary mt-1 leading-relaxed">{entry.observacoes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit full button */}
                  <button onClick={() => setEditingEntry(entry)}
                    className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-emerald-500 transition-colors px-1">
                    <Pencil size={11} /> Editar todos os campos
                  </button>
                </div>
              )}
            </div>
          )
        })}
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
