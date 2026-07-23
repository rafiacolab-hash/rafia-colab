'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Save, Loader2, Building2 } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type Client = { id: string; name: string; color: string }

const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

// ─── Modal de criar/editar cliente ─────────────────────────────────────────────
type ModalProps = {
  client: Client | null   // null = criar novo
  onClose: () => void
  onSaved: () => void
}

function ClientModal({ client, onClose, onSaved }: ModalProps) {
  const isNew = !client
  const [name, setName]   = useState(client?.name ?? '')
  const [color, setColor] = useState(client?.color ?? COLOR_OPTIONS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }

    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        // Usa a API route server-side (service_role) — evita duplicados e bypassa RLS
        const res = await fetch('/api/admin/create-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), color }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Erro ao criar cliente.')
      } else {
        const supabase = createDataClient()
        const { error: err } = await supabase
          .from('clients')
          .update({ name: name.trim(), color })
          .eq('id', client!.id)
        if (err) throw err
      }

      // Atualiza a lista de clientes na sidebar imediatamente
      if (typeof window !== 'undefined') {
        (window as Window & { __sidebarRefreshClients?: () => void }).__sidebarRefreshClients?.()
      }

      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
      setSaving(false)
    }
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !saving) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-theme-bg border border-theme-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <h2 className="text-theme-primary font-semibold text-base">
            {isNew ? 'Novo cliente' : 'Editar cliente'}
          </h2>
          <button onClick={onClose} disabled={saving}
            className="text-zinc-500 hover:text-theme-primary transition-colors p-1.5 rounded-lg hover:bg-theme-surface">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Nome do cliente</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Acme Cosméticos"
              autoFocus
              className="w-full bg-theme-card border border-theme-border-strong rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Cor */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Cor de identificação</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-theme-bg ring-theme-primary scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-border">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:text-theme-primary hover:bg-theme-surface transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 text-black font-semibold text-sm rounded-lg transition-colors">
            {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Save size={14} />Salvar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function AdminClientsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editClient, setEditClient] = useState<Client | null | undefined>(undefined)
  // undefined = modal fechado | null = novo | Client = editar

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createDataClient()
      const { data } = await supabase.from('clients').select('id, name, color').order('name')
      if (data) setClients(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard')
      return
    }
    fetchAll()
  }, [authLoading, isAdmin, router, fetchAll])

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Topbar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Clientes</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{clients.length} clientes cadastrados</p>
          </div>
          <button
            onClick={() => setEditClient(null)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-theme-primary text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} /> Novo cliente
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <Building2 size={28} className="text-zinc-600" />
              <p className="text-theme-muted text-sm">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
              {clients.map((client, idx) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-theme-surface/40 transition-colors ${
                    idx < clients.length - 1 ? 'border-b border-theme-border' : ''
                  }`}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-theme-primary text-sm font-medium truncate">{client.name}</p>
                  </div>
                  <button
                    onClick={() => setEditClient(client)}
                    className="text-theme-muted hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-theme-surface flex-shrink-0"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {editClient !== undefined && (
        <ClientModal
          client={editClient}
          onClose={() => setEditClient(undefined)}
          onSaved={() => { setEditClient(undefined); fetchAll() }}
        />
      )}
    </>
  )
}
