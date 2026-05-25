'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Save, Loader2, UserCircle2, ShieldCheck, Briefcase } from 'lucide-react'
import { createDataClient } from '@/app/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type UserRole = 'admin' | 'assistant' | 'client'
type Client = { id: string; name: string; color: string }
type UserProfile = {
  id: string
  name: string
  role: UserRole
  client_id: string | null
  client?: Client | null
}

// ─── Configuração de roles ──────────────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  admin:     { label: 'Admin',      icon: <ShieldCheck size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  assistant: { label: 'Assistente', icon: <Briefcase   size={12} />, color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30'       },
  client:    { label: 'Cliente',    icon: <UserCircle2 size={12} />, color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30'     },
}

// ─── Modal de criar/editar usuário ─────────────────────────────────────────────
type ModalProps = {
  user: UserProfile | null   // null = criar novo
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}

function UserModal({ user, clients, onClose, onSaved }: ModalProps) {
  const isNew = !user
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState<UserRole>(user?.role ?? 'assistant')
  const [clientId, setClientId] = useState<string>(user?.client_id ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (isNew && !email.trim()) { setError('E-mail é obrigatório para criar usuário.'); return }

    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        // Usa a API route server-side que tem a service_role key para convidar o usuário
        const res = await fetch('/api/admin/invite-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), role, client_id: clientId || null }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Erro ao criar usuário.')
      } else {
        // Edição: atualiza só o perfil (sem mexer no auth user)
        const supabase = createDataClient()
        const { error: err } = await supabase
          .from('users_profile')
          .update({
            name:      name.trim(),
            role,
            client_id: clientId || null,
          })
          .eq('id', user!.id)
        if (err) throw err
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
            {isNew ? 'Novo usuário' : 'Editar usuário'}
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
            <label className="text-xs text-zinc-500">Nome completo</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Robson Camargo"
              className="w-full bg-theme-card border border-theme-border-strong rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          {/* Email (só para criação) */}
          {isNew && (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="w-full bg-theme-card border border-theme-border-strong rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <p className="text-xs text-theme-muted">
                O usuário receberá um convite por e-mail para definir a senha.
              </p>
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Perfil de acesso</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([r, cfg]) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                    role === r
                      ? `${cfg.bg} ${cfg.color}`
                      : 'border-theme-border text-theme-muted hover:border-theme-border-strong hover:text-theme-secondary'
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vínculo com cliente (só para role=client) */}
          {role === 'client' && (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Cliente vinculado</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-theme-card border border-theme-border-strong rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                <option value="">— Selecione um cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

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
export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers]     = useState<UserProfile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<UserProfile | null | undefined>(undefined)
  // undefined = modal fechado | null = novo | UserProfile = editar

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createDataClient()
      const [{ data: usersData }, { data: clientsData }] = await Promise.all([
        supabase
          .from('users_profile')
          .select('id, name, role, client_id, clients:client_id(id, name, color)')
          .order('name'),
        supabase.from('clients').select('id, name, color').order('name'),
      ])
      if (usersData)   setUsers(usersData as UserProfile[])
      if (clientsData) setClients(clientsData)
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

  const groupedByRole: Record<UserRole, UserProfile[]> = { admin: [], assistant: [], client: [] }
  for (const u of users) groupedByRole[u.role]?.push(u)

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Topbar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-theme-primary">Usuários</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{users.length} usuários cadastrados</p>
          </div>
          <button
            onClick={() => setEditUser(null)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-theme-primary text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={15} /> Novo usuário
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            (['admin', 'assistant', 'client'] as UserRole[]).map(role => {
              const group = groupedByRole[role]
              if (group.length === 0) return null
              const cfg = ROLE_CONFIG[role]
              return (
                <div key={role}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`${cfg.color}`}>{cfg.icon}</span>
                    <p className={`text-xs font-medium uppercase tracking-wider ${cfg.color}`}>
                      {cfg.label}s — {group.length}
                    </p>
                  </div>
                  <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
                    {group.map((user, idx) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-4 px-5 py-3.5 hover:bg-theme-surface/40 transition-colors ${
                          idx < group.length - 1 ? 'border-b border-theme-border' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color} border`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-theme-primary text-sm font-medium truncate">{user.name}</p>
                          <p className="text-theme-muted text-xs font-mono truncate">{user.id.slice(0, 16)}…</p>
                        </div>

                        {/* Cliente vinculado (para role=client) */}
                        {role === 'client' && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            {user.client ? (
                              <>
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: (user.client as Client).color }}
                                />
                                <span className="text-xs text-theme-secondary truncate max-w-[120px]">
                                  {(user.client as Client).name}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-red-400 italic">Sem vínculo</span>
                            )}
                          </div>
                        )}

                        {/* Botão editar */}
                        <button
                          onClick={() => setEditUser(user)}
                          className="text-theme-muted hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-theme-surface flex-shrink-0"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {editUser !== undefined && (
        <UserModal
          user={editUser}
          clients={clients}
          onClose={() => setEditUser(undefined)}
          onSaved={() => { setEditUser(undefined); fetchAll() }}
        />
      )}
    </>
  )
}
