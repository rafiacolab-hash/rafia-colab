const statusConfig: Record<string, { label: string; className: string }> = {
  A_FAZER:    { label: 'A Fazer',       className: 'bg-theme-surface text-theme-secondary border-theme-border' },
  ANDAMENTO:  { label: 'Em Andamento',  className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  AGUARDANDO: { label: 'Ag. Aprovação', className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  CORRECAO:   { label: 'Em Correção',   className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30' },
  AGENDADO:   { label: 'Agendado',      className: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  CONCLUIDO:  { label: 'Concluído',     className: 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  POSTADO:    { label: 'Postado',       className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  CANCELADO:  { label: 'Cancelado/Pendente', className: 'bg-theme-surface/50 text-theme-muted border-theme-border' },
  // legado – entradas antigas podem ainda ter este valor
  VALIDACAO:  { label: 'Em Validação',  className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' },
}

export default function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const config = statusConfig[status] || { label: status, className: 'bg-theme-surface text-theme-secondary border-theme-border' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  )
}
