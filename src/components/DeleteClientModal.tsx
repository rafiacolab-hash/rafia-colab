'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'

type Props = {
  clientId: string
  clientName: string
  onClose: () => void
  onDeleted: () => void
}

/** Pop-up de confirmação para excluir um cliente de vez. Pede para digitar o nome. */
export default function DeleteClientModal({ clientId, clientName, onClose, onDeleted }: Props) {
  const [typed, setTyped]       = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [counts, setCounts]     = useState<{ months: number; days: number } | null>(null)

  useEffect(() => {
    const supabase = createDataClient()
    Promise.all([
      supabase.from('month_lists').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('day_entries').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    ]).then(([m, d]) => setCounts({ months: m.count ?? 0, days: d.count ?? 0 }))
  }, [clientId])

  const canDelete = typed.trim() === clientName.trim() && !deleting

  const handleDelete = async () => {
    if (!canDelete) return
    setDeleting(true); setError(null)
    try {
      const res = await fetch('/api/admin/delete-client', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `Erro ${res.status}`)
      ;(window as Window & { __sidebarRefreshClients?: () => void }).__sidebarRefreshClients?.()
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir cliente.')
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget && !deleting) onClose() }}
    >
      <div className="w-full max-w-md bg-theme-bg border border-theme-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <h2 className="text-theme-primary font-semibold text-base flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Excluir cliente
          </h2>
          <button onClick={onClose} disabled={deleting}
            className="text-zinc-500 hover:text-theme-primary transition-colors p-1.5 rounded-lg hover:bg-theme-surface">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-600 dark:text-red-400 space-y-1">
            <p className="font-semibold">Esta ação é irreversível.</p>
            <p>
              Você vai apagar <strong>{clientName}</strong> e tudo que é dele:
              {counts
                ? ` ${counts.months} ${counts.months === 1 ? 'mês' : 'meses'} de planejamento (${counts.days} dias),`
                : ' os meses de planejamento,'}
              {' '}o Perfil da Marca com os arquivos e as métricas do Instagram. Não dá para recuperar depois.
            </p>
          </div>

          <p className="text-theme-secondary">
            Se só quer tirar o cliente da lista, use <strong>Desativar cliente</strong> no Perfil da Marca. Nada é apagado.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">
              Para confirmar, digite o nome do cliente: <strong className="text-theme-primary">{clientName}</strong>
            </label>
            <input
              value={typed} onChange={e => setTyped(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleDelete() }}
              className="w-full bg-theme-card border border-theme-border-strong rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-border">
          <button onClick={onClose} disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={!canDelete}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors">
            {deleting ? <><Loader2 size={14} className="animate-spin" />Excluindo...</> : <><Trash2 size={14} />Excluir de vez</>}
          </button>
        </div>
      </div>
    </div>
  )
}
