'use client'

import { useState } from 'react'
import { X, Save, Loader2, ExternalLink } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

// ─── Configuração de status ────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: DayEntryStatus; label: string }[] = [
  { value: null,         label: '—'             },
  { value: 'A_FAZER',    label: 'A Fazer'        },
  { value: 'AGUARDANDO', label: 'Ag. Aprovação'  },
  { value: 'ANDAMENTO',  label: 'Em Andamento'   },
  { value: 'VALIDACAO',  label: 'Em Validação'   },
  { value: 'CORRECAO',   label: 'Em Correção'    },
  { value: 'CANCELADO',  label: 'Cancelado'      },
  { value: 'POSTADO',    label: 'Postado'        },
]

const STATUS_BG: Record<string, string> = {
  A_FAZER:    'bg-zinc-700/50 text-zinc-400 border-zinc-600',
  AGUARDANDO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ANDAMENTO:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VALIDACAO:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CORRECAO:   'bg-red-500/20 text-red-400 border-red-500/30',
  CANCELADO:  'bg-zinc-800/50 text-zinc-600 border-zinc-700',
  POSTADO:    'bg-green-500/20 text-green-400 border-green-500/30',
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Props = {
  entry: DayEntry
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  stories_content: string
  stories_status: DayEntryStatus
  stories_format: string
  feed_content: string
  feed_status: DayEntryStatus
  feed_format: string
  acoes_content: string
  acoes_status: DayEntryStatus
  acoes_format: string
  legenda_copy: string
  arte_link: string
  observacoes: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatFullDate(entry: DayEntry): string {
  const date = new Date(entry.entry_date + 'T12:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${entry.dia_semana}, ${day} ${months[date.getMonth()]}`
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
function StatusSelect({
  value,
  onChange,
}: {
  value: DayEntryStatus
  onChange: (v: DayEntryStatus) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange((e.target.value || null) as DayEntryStatus)}
      className={`
        w-full appearance-none rounded-md border px-2.5 py-1.5 text-xs font-medium
        bg-zinc-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500
        transition-colors
        ${value ? STATUS_BG[value] : 'bg-zinc-800/50 text-zinc-600 border-zinc-700'}
      `}
    >
      {STATUS_OPTIONS.map(opt => (
        <option
          key={opt.value ?? 'null'}
          value={opt.value ?? ''}
          className="bg-zinc-900 text-white"
        >
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-zinc-500">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? 'Descreva o conteúdo...'}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
      />
    </div>
  )
}

function TextInputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-zinc-500">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
      />
    </div>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────────
export default function EditEntryModal({ entry, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    stories_content: entry.stories_content ?? '',
    stories_status:  entry.stories_status  ?? null,
    stories_format:  entry.stories_format  ?? '',
    feed_content:    entry.feed_content    ?? '',
    feed_status:     entry.feed_status     ?? null,
    feed_format:     entry.feed_format     ?? '',
    acoes_content:   entry.acoes_content   ?? '',
    acoes_status:    entry.acoes_status    ?? null,
    acoes_format:    entry.acoes_format    ?? '',
    legenda_copy:    entry.legenda_copy    ?? '',
    arte_link:       entry.arte_link       ?? '',
    observacoes:     entry.observacoes     ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const supabase = createDataClient()
      const { error: err } = await supabase
        .from('day_entries')
        .update({
          stories_content: form.stories_content || null,
          stories_status:  form.stories_status,
          stories_format:  form.stories_format  || null,
          feed_content:    form.feed_content    || null,
          feed_status:     form.feed_status,
          feed_format:     form.feed_format     || null,
          acoes_content:   form.acoes_content   || null,
          acoes_status:    form.acoes_status,
          acoes_format:    form.acoes_format    || null,
          legenda_copy:    form.legenda_copy    || null,
          arte_link:       form.arte_link       || null,
          observacoes:     form.observacoes     || null,
          updated_at:      new Date().toISOString(),
        })
        .eq('id', entry.id)

      if (err) throw err
      onSaved()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.'
      setError(msg)
      setSaving(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) onClose()
  }

  const sections = [
    {
      key: 'stories' as const,
      label: 'Stories',
      accentBorder: 'border-pink-500/30',
      dot: 'bg-pink-400',
      content:   form.stories_content,
      status:    form.stories_status,
      format:    form.stories_format,
      onContent: (v: string) => set('stories_content', v),
      onStatus:  (v: DayEntryStatus) => set('stories_status', v),
      onFormat:  (v: string) => set('stories_format', v),
    },
    {
      key: 'feed' as const,
      label: 'Feed',
      accentBorder: 'border-blue-500/30',
      dot: 'bg-blue-400',
      content:   form.feed_content,
      status:    form.feed_status,
      format:    form.feed_format,
      onContent: (v: string) => set('feed_content', v),
      onStatus:  (v: DayEntryStatus) => set('feed_status', v),
      onFormat:  (v: string) => set('feed_format', v),
    },
    {
      key: 'acoes' as const,
      label: 'Ação',
      accentBorder: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
      content:   form.acoes_content,
      status:    form.acoes_status,
      format:    form.acoes_format,
      onContent: (v: string) => set('acoes_content', v),
      onStatus:  (v: DayEntryStatus) => set('acoes_status', v),
      onFormat:  (v: string) => set('acoes_format', v),
    },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base capitalize">
              {formatFullDate(entry)}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">Editar planejamento do dia</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corpo (scrollável) ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Seções Stories / Feed / Ação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections.map(sec => (
              <div
                key={sec.key}
                className={`bg-zinc-900 rounded-xl border ${sec.accentBorder} p-4 space-y-3`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sec.dot}`} />
                  <span className="text-sm font-medium text-white">{sec.label}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-500">Status</label>
                  <StatusSelect value={sec.status} onChange={sec.onStatus} />
                </div>

                <TextAreaField
                  label="Conteúdo"
                  value={sec.content}
                  onChange={sec.onContent}
                  rows={4}
                  placeholder={`Descreva o ${sec.label.toLowerCase()}...`}
                />

                <TextInputField
                  label="Formato"
                  value={sec.format}
                  onChange={sec.onFormat}
                  placeholder="Ex: Reels, Carrossel..."
                />
              </div>
            ))}
          </div>

          {/* Extras: Legenda / Arte / Obs */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Extras</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextAreaField
                label="Legenda / Copy"
                value={form.legenda_copy}
                onChange={v => set('legenda_copy', v)}
                rows={5}
                placeholder="Texto da legenda ou copy..."
              />
              <div className="space-y-3">
                <div className="space-y-1">
                  <TextInputField
                    label="Arte / Link"
                    value={form.arte_link}
                    onChange={v => set('arte_link', v)}
                    placeholder="https://..."
                    type="url"
                  />
                  {form.arte_link && (
                    <a
                      href={form.arte_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline ml-0.5"
                    >
                      <ExternalLink size={11} /> Abrir link
                    </a>
                  )}
                </div>
                <TextAreaField
                  label="Observações"
                  value={form.observacoes}
                  onChange={v => set('observacoes', v)}
                  rows={3}
                  placeholder="Notas internas, ajustes, referências..."
                />
              </div>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          <p className="text-xs text-zinc-600">
            ID: {entry.id.slice(0, 8)}…
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
