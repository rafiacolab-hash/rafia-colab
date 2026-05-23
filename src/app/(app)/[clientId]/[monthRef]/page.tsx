'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, LayoutList, Columns3, CalendarDays } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createDataClient } from '@/app/lib/supabase'
import { getEntriesByClientAndMonth, type DayEntry } from '@/app/lib/entries'
import ListaView from '@/components/ListaView'
import KanbanView from '@/components/KanbanView'
import CalendarView from '@/components/CalendarView'
import StatsBar from '@/components/StatsBar'
import GenerateMonthModal from '@/components/GenerateMonthModal'

type ViewMode = 'lista' | 'kanban' | 'calendario'

// ─── Helpers de navegação entre meses ────────────────────────────────────────
function shiftMonth(ref: string, delta: 1 | -1): string {
  const [y, m] = ref.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type Props = {
  params: { clientId: string; monthRef: string }
}

export default function ClientMonthPage({ params }: Props) {
  const { clientId, monthRef } = params
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [clientName, setClientName] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('lista')

  // Busca o nome do cliente — usa createDataClient() (sem lock de auth)
  useEffect(() => {
    const supabase = createDataClient()
    supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single()
      .then(({ data }: { data: { name: string } | null }) => {
        if (data) setClientName(data.name)
      })
  }, [clientId])

  const fetchEntries = async () => {
    console.log('[page] fetchEntries iniciando', { clientId, monthRef })
    setLoading(true)
    try {
      const data = await getEntriesByClientAndMonth(clientId, monthRef)
      console.log('[page] entries recebidas:', data?.length)
      setEntries(data)
    } catch (err) {
      console.error('[page] erro em fetchEntries:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clientId && monthRef) {
      fetchEntries()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, monthRef])

  const formattedMonth = new Date(monthRef + '-02').toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric',
  })

  const goToPrev = () => router.push(`/${clientId}/${shiftMonth(monthRef, -1)}`)
  const goToNext = () => router.push(`/${clientId}/${shiftMonth(monthRef, 1)}`)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        {/* Navegação de mês */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[140px]">
            <h1 className="text-lg font-semibold text-white capitalize">{formattedMonth}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">{entries.length} dias planejados</p>
          </div>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Lista / Kanban / Calendário */}
          <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-0.5">
            {([
              ['lista',     'Lista',      <LayoutList  size={15} />],
              ['kanban',    'Kanban',     <Columns3    size={15} />],
              ['calendario','Calendário', <CalendarDays size={15} />],
            ] as const).map(([mode, title, icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Gerar Mês
            </button>
          )}
        </div>
      </div>

      {entries.length > 0 && <StatsBar entries={entries} />}

      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-zinc-500 text-sm">Nenhum dia planejado para este mês.</p>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
              >
                Gerar planejamento do mês
              </button>
            )}
          </div>
        ) : viewMode === 'lista' ? (
          <ListaView entries={entries} onRefresh={fetchEntries} />
        ) : viewMode === 'kanban' ? (
          <KanbanView entries={entries} onRefresh={fetchEntries} />
        ) : (
          <CalendarView entries={entries} monthRef={monthRef} onRefresh={fetchEntries} />
        )}
      </div>

      {showModal && (
        <GenerateMonthModal
          clientId={clientId}
          clientName={clientName}
          monthRef={monthRef}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchEntries() }}
        />
      )}
    </div>
  )
}