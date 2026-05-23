const statusConfig: Record<string, { label: string; className: string }> = {
  AGUARDANDO:  { label: 'Ag. Aprovação', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  A_FAZER:     { label: 'A Fazer',       className: 'bg-zinc-700/50 text-zinc-400 border-zinc-600' },
  ANDAMENTO:   { label: 'Em Andamento',  className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  VALIDACAO:   { label: 'Em Validação',  className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  CORRECAO:    { label: 'Em Correção',   className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  CANCELADO:   { label: 'Cancelado',     className: 'bg-zinc-800/50 text-zinc-600 border-zinc-700' },
  POSTADO:     { label: 'Postado',       className: 'bg-green-500/20 text-green-400 border-green-500/30' },
}

export default function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const config = statusConfig[status] || { label: status, className: 'bg-zinc-700 text-zinc-400' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  )
}