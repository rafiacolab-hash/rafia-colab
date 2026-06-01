'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, Loader2, ExternalLink, Check, ChevronDown } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

const STATUS_OPTIONS: { value: DayEntryStatus; label: string; dot: string }[] = [
  { value: null,         label: '—',             dot: 'bg-theme-border'  },
  { value: 'A_FAZER',    label: 'A Fazer',        dot: 'bg-zinc-500'      },
  { value: 'ANDAMENTO',  label: 'Em Andamento',   dot: 'bg-blue-400'      },
  { value: 'AGUARDANDO', label: 'Ag. Aprovação',  dot: 'bg-amber-400'     },
  { value: 'CORRECAO',   label: 'Em Correção',    dot: 'bg-red-400'       },
  { value: 'AGENDADO',   label: 'Agendado',       dot: 'bg-sky-400'       },
  { value: 'CONCLUIDO',  label: 'Concluído',      dot: 'bg-violet-400'    },
  { value: 'POSTADO',    label: 'Postado',        dot: 'bg-emerald-400'   },
  { value: 'CANCELADO',  label: 'Cancelado',      dot: 'bg-zinc-400'      },
]

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter(o => o.value).map(o => [o.value, o.label])
)
const STATUS_DOT: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter(o => o.value).map(o => [o.value, o.dot])
)

type Props  = { entry: DayEntry; onClose: () => void; onSaved: () => void }

type FormState = {
  stories_content: string; stories_status: DayEntryStatus; stories_format: string
  feed_content: string;    feed_status: DayEntryStatus;    feed_format: string
  acoes_content: string;   acoes_status: DayEntryStatus;   acoes_format: string
  legenda_copy: string; arte_link: string; observacoes: string
}

function formatFullDate(entry: DayEntry): string {
  const date = new Date(entry.entry_date + 'T12:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${entry.dia_semana}, ${day} ${months[date.getMonth()]}`
}

function StatusSelect({ value, onChange }: { value: DayEntryStatus; onChange: (v: DayEntryStatus) => void }) {
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

  const select = (v: DayEntryStatus) => {
    setOpen(false)
    onChange(v)
  }

  const currentLabel = value ? (STATUS_LABEL[value] ?? value) : '—'
  const currentDot   = value ? (STATUS_DOT[value]  ?? 'bg-zinc-400') : 'bg-theme-border'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-md border border-theme-border bg-theme-surface px-2.5 py-1.5 text-xs font-medium text-theme-secondary hover:bg-theme-raised transition-colors"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentDot}`} />
        <span className="flex-1 text-left">{currentLabel}</span>
        <ChevronDown size={12} className={`flex-shrink-0 text-theme-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-theme-card border border-theme-border rounded-xl shadow-2xl p-1.5 min-w-full">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value ?? 'none'}
              type="button"
              onClick={() => select(opt.value)}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-theme-surface transition-colors flex items-center gap-2.5 ${
                value === opt.value ? 'bg-theme-surface/80' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
              <span className="text-theme-secondary flex-1">{opt.label}</span>
              {value === opt.value && <Check size={11} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TextAreaField({ label, value, onChange, rows = 3, placeholder }:
  { label?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-theme-secondary">{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder ?? 'Descreva o conteúdo...'}
        className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-primary
          placeholder-theme-muted focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
          resize-none transition-colors" />
    </div>
  )
}

function TextInputField({ label, value, onChange, placeholder, type = 'text' }:
  { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-theme-secondary">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-primary
          placeholder-theme-muted focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
    </div>
  )
}

export default function EditEntryModal({ entry, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    stories_content: entry.stories_content ?? '', stories_status: entry.stories_status ?? null, stories_format: entry.stories_format ?? '',
    feed_content:    entry.feed_content    ?? '', feed_status:    entry.feed_status    ?? null, feed_format:    entry.feed_format    ?? '',
    acoes_content:   entry.acoes_content   ?? '', acoes_status:   entry.acoes_status   ?? null, acoes_format:   entry.acoes_format   ?? '',
    legenda_copy: entry.legenda_copy ?? '', arte_link: entry.arte_link ?? '', observacoes: entry.observacoes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const supabase = createDataClient()
      // Auto-define A_FAZER quando há conteúdo mas nenhum status foi selecionado
      const storiesStatus = form.stories_status ?? (form.stories_content?.trim() ? 'A_FAZER' : null)
      const feedStatus    = form.feed_status    ?? (form.feed_content?.trim()    ? 'A_FAZER' : null)
      const acoesStatus   = form.acoes_status   ?? (form.acoes_content?.trim()   ? 'A_FAZER' : null)
      const { error: err } = await supabase.from('day_entries').update({
        stories_content: form.stories_content || null, stories_status: storiesStatus, stories_format: form.stories_format || null,
        feed_content:    form.feed_content    || null, feed_status:    feedStatus,    feed_format:    form.feed_format    || null,
        acoes_content:   form.acoes_content   || null, acoes_status:   acoesStatus,   acoes_format:   form.acoes_format   || null,
        legenda_copy: form.legenda_copy || null, arte_link: form.arte_link || null, observacoes: form.observacoes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', entry.id)
      if (err) throw err
      onSaved()
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message :
        (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message) :
        JSON.stringify(e)
      console.error('[EditEntryModal] save error:', e)
      setError(msg || 'Erro ao salvar.')
      setSaving(false)
    }
  }

  const sections = [
    { key: 'stories' as const, label: 'Stories', accent: 'border-pink-500/30', dot: 'bg-pink-400',
      content: form.stories_content, status: form.stories_status, format: form.stories_format,
      onContent: (v: string) => set('stories_content', v), onStatus: (v: DayEntryStatus) => set('stories_status', v), onFormat: (v: string) => set('stories_format', v) },
    { key: 'feed' as const, label: 'Feed', accent: 'border-blue-500/30', dot: 'bg-blue-400',
      content: form.feed_content, status: form.feed_status, format: form.feed_format,
      onContent: (v: string) => set('feed_content', v), onStatus: (v: DayEntryStatus) => set('feed_status', v), onFormat: (v: string) => set('feed_format', v) },
    { key: 'acoes' as const, label: 'Ação', accent: 'border-emerald-500/30', dot: 'bg-emerald-400',
      content: form.acoes_content, status: form.acoes_status, format: form.acoes_format,
      onContent: (v: string) => set('acoes_content', v), onStatus: (v: DayEntryStatus) => set('acoes_status', v), onFormat: (v: string) => set('acoes_format', v) },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="w-full max-w-3xl bg-theme-card border border-theme-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border flex-shrink-0">
          <div>
            <h2 className="text-theme-primary font-semibold text-base capitalize">{formatFullDate(entry)}</h2>
            <p className="text-theme-secondary text-xs mt-0.5">Editar planejamento do dia</p>
          </div>
          <button onClick={onClose} disabled={saving}
            className="text-theme-muted hover:text-theme-primary transition-colors p-1.5 rounded-lg hover:bg-theme-surface disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map(sec => (
              <div key={sec.key} className={`bg-theme-surface rounded-xl border ${sec.accent} p-4 space-y-3`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sec.dot}`} />
                  <span className="text-sm font-medium text-theme-primary">{sec.label}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-theme-secondary">Status</label>
                  <StatusSelect value={sec.status} onChange={sec.onStatus} />
                </div>
                <TextAreaField label="Conteúdo" value={sec.content} onChange={sec.onContent} rows={4}
                  placeholder={`Descreva o ${sec.label.toLowerCase()}...`} />
                <TextInputField label="Formato" value={sec.format} onChange={sec.onFormat} placeholder="Ex: Reels, Carrossel..." />
              </div>
            ))}
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme-border p-4 space-y-4">
            <p className="text-xs font-medium text-theme-secondary uppercase tracking-wider">Extras</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextAreaField label="Legenda / Copy" value={form.legenda_copy}
                onChange={v => set('legenda_copy', v)} rows={5} placeholder="Texto da legenda ou copy..." />
              <div className="space-y-3">
                <div className="space-y-1">
                  <TextAreaField label="Arte / Links (um por linha)" value={form.arte_link}
                    onChange={v => set('arte_link', v)} rows={3}
                    placeholder={'https://drive.google.com/...\nhttps://canva.com/...'} />
                  {form.arte_link && (
                    <div className="flex flex-col gap-0.5 ml-0.5">
                      {form.arte_link.split('\n').map(l => l.trim()).filter(Boolean).map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline truncate">
                          <ExternalLink size={11} /> {link}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <TextAreaField label="Observações" value={form.observacoes}
                  onChange={v => set('observacoes', v)} rows={3} placeholder="Notas internas, ajustes..." />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-theme-border flex-shrink-0">
          <p className="text-xs text-theme-muted">ID: {entry.id.slice(0, 8)}…</p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg transition-colors">
              {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
