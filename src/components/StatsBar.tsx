import type { DayEntry, DayEntryStatus } from '@/app/lib/entries'

type Props = { entries: DayEntry[] }

const STATUS_CONFIG: Record<NonNullable<DayEntryStatus>, { label: string; color: string }> = {
  A_FAZER:    { label: 'A Fazer',       color: 'bg-zinc-500'    },
  ANDAMENTO:  { label: 'Em Andamento',  color: 'bg-blue-500'    },
  AGUARDANDO: { label: 'Ag. Aprovação', color: 'bg-amber-500'   },
  CORRECAO:   { label: 'Em Correção',   color: 'bg-red-500'     },
  AGENDADO:   { label: 'Agendado',      color: 'bg-sky-500'     },
  CONCLUIDO:  { label: 'Concluído',     color: 'bg-violet-500'  },
  POSTADO:    { label: 'Postado',       color: 'bg-emerald-500' },
  CANCELADO:  { label: 'Cancelado',     color: 'bg-zinc-400'    },
}

// Fallback para status legados (ex: VALIDACAO de entradas antigas)
const LEGACY_CONFIG: Record<string, { label: string; color: string }> = {
  VALIDACAO: { label: 'Em Validação', color: 'bg-purple-500' },
}

export default function StatsBar({ entries }: Props) {
  const counts: Record<string, number> = {}
  let total = 0

  for (const entry of entries) {
    for (const status of [entry.stories_status, entry.feed_status, entry.acoes_status]) {
      if (status) {
        counts[status] = (counts[status] || 0) + 1
        total++
      }
    }
  }

  return (
    <div className="flex items-center gap-4 px-8 py-3 border-b border-theme-border flex-wrap bg-theme-bg">
      {Object.entries(counts).map(([status, count]) => {
        const cfg = STATUS_CONFIG[status as NonNullable<DayEntryStatus>] ?? LEGACY_CONFIG[status]
        if (!cfg) return null
        return (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
            <span className="text-xs text-theme-secondary">{cfg.label}</span>
            <span className="text-xs font-semibold text-theme-primary">{count}</span>
          </div>
        )
      })}
      <div className="ml-auto text-xs text-theme-muted">
        <span className="text-theme-primary font-medium">{total}</span> conteúdos ·{' '}
        <span className="text-theme-primary font-medium">{entries.length}</span> dias
      </div>
    </div>
  )
}
