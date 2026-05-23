'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient, createDataClient, getUserFromCookie } from '@/app/lib/supabase'
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react'

type Client = { id: string; name: string; color: string }
type MonthList = { id: string; month_ref: string; year: number }

export default function Sidebar() {
  const [clients, setClients] = useState<Client[]>([])
  const [monthsByClient, setMonthsByClient] = useState<Record<string, MonthList[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('...')

  const router = useRouter()
  const pathname = usePathname()

  const loadClients = async (role: string, clientId: string | null) => {
    const supabase = createDataClient()
    // Para role=client, mostra apenas o próprio cliente
    if (role === 'client' && clientId) {
      const { data } = await supabase.from('clients').select('*').eq('id', clientId)
      if (data) setClients(data)
    } else {
      const { data } = await supabase.from('clients').select('*').order('name')
      if (data) setClients(data)
    }
  }

  useEffect(() => {
    // Lê usuário do cookie — sem getSession(), sem lock
    const cookieUser = getUserFromCookie()
    if (cookieUser) {
      const supabase = createDataClient()
      supabase.from('users_profile').select('name, role, client_id').eq('id', cookieUser.id).single()
        .then(({ data: profile }) => {
          if (profile) {
            setUserName(profile.name)
            const roleMap: Record<string, string> = { admin: 'Admin', assistant: 'Assistente', client: 'Cliente' }
            setUserRole(roleMap[profile.role] || profile.role)
            loadClients(profile.role, profile.client_id ?? null)
          }
        })
    } else {
      loadClients('', null)
    }

    // onAuthStateChange apenas para detectar logout em tempo real
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.push('/login') }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleClient = async (clientId: string) => {
    setExpanded(prev => ({ ...prev, [clientId]: !prev[clientId] }))
    if (!monthsByClient[clientId]) {
      const supabase = createDataClient()
      const { data } = await supabase.from('month_lists').select('*').eq('client_id', clientId).order('month_ref', { ascending: false })
      if (data) setMonthsByClient(prev => ({ ...prev, [clientId]: data }))
    }
  }

  // Exposto globalmente para que o GenerateMonthModal possa disparar após gerar um mês
  const refreshMonths = async (clientId: string) => {
    const supabase = createDataClient()
    const { data } = await supabase.from('month_lists').select('*').eq('client_id', clientId).order('month_ref', { ascending: false })
    if (data) setMonthsByClient(prev => ({ ...prev, [clientId]: data }))
  }
  if (typeof window !== 'undefined') {
    (window as Window & { __sidebarRefreshMonths?: (id: string) => void }).__sidebarRefreshMonths = refreshMonths
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatMonth = (monthRef: string) => {
    const [year, month] = monthRef.split('-')
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${months[parseInt(month) - 1]} ${year}`
  }

  return (
    <aside className="w-[235px] min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center text-black font-bold text-sm">R</div>
          <span className="text-white font-semibold text-sm">Ráfia Co.lab</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {/* "Todos os clientes" só aparece para admin/assistant */}
        {userRole !== 'Cliente' && (
          <button onClick={() => router.push('/dashboard')} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${pathname === '/dashboard' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            Todos os clientes
          </button>
        )}
        {/* "Usuários" só para admin */}
        {userRole === 'Admin' && (
          <button onClick={() => router.push('/admin/users')} className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 transition-colors ${pathname.startsWith('/admin/users') ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            Usuários
          </button>
        )}
        <p className="text-zinc-600 text-xs font-medium px-3 py-2 uppercase tracking-wider">
          {userRole === 'Cliente' ? 'Meus dados' : 'Clientes'}
        </p>
        {clients.length === 0 && <p className="text-zinc-600 text-xs px-3 py-2">Carregando...</p>}
        {clients.map(client => (
          <div key={client.id}>
            <button onClick={() => toggleClient(client.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
              <span className="flex-1 truncate">{client.name}</span>
              {expanded[client.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {expanded[client.id] && (
              <div className="ml-7 mt-1 space-y-1">
                {(monthsByClient[client.id] || []).map(month => (
                  <button key={month.id} onClick={() => router.push(`/${client.id}/${month.month_ref}`)} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
                    {formatMonth(month.month_ref)}
                  </button>
                ))}
                {(monthsByClient[client.id] || []).length === 0 && <p className="text-zinc-600 text-xs px-3 py-1">Nenhum mês</p>}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-semibold">
            {userName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName || 'Carregando...'}</p>
            <p className="text-zinc-500 text-xs">{userRole}</p>
          </div>
          <button onClick={handleLogout} className="text-zinc-500 hover:text-white transition-colors" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}