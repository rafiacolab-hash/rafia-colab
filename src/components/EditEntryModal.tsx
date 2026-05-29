'use client'

import { useState } from 'react'
import { X, Save, Loader2, ExternalLink } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

const STATUS_OPTIONS: { value: DayEntryStatus; label: string }[] = [
  { value: null,         label: '—'            },
  { value: 'A_FAZER',    label: 'A Fazer'       },
  { value: 'ANDAMENTO',  label: 'Em Andamento'  },
  { value: 'AGUARDANDO', label: 'Ag. Aprovação' },
  { value: 'CORRECAO',   label: 'Em Correção'   },
  { value: 'AGENDADO',   label: 'Agendado'      },
  { value: 'CONCLUIDO',  label: 'Concluído'     },
  { value: 'POSTADO',    label: 'Postado'       },
  { value: 'CANCELADO',  label: 'Cancelado'     },
]

// Classes do select colorizadas por status (funciona em ambos os temas por usar cores fixas com alpha)
const STATUS_BG: Record<string, string> = {
  A_FAZER:    'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  ANDAMENTO:  'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  AGUARDANDO: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CORRECAO:   'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  AGENDADO:   'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  CONCLUIDO:  'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  POSTADO:    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  CANCELADO:  'bg-theme-surface/50 text-theme-muted border-theme-border',
  // legado
  VALIDACAO:  'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
}

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
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange((e.target.value || null) as DayEntryStatus)}
      className={`w-full appearance-none rounded-md border px-2.5 py-1.5 text-xs font-medium
        bg-theme-bg cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors
        ${value ? STATUS_BG[value] : 'bg-theme-surface/50 text-theme-muted border-theme-border'}`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value ?? 'null'} value={opt.value ?? ''} className="bg-theme-card text-theme-primary">
          {opt.label}
        </option>
      ))}
    </select>
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
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
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
