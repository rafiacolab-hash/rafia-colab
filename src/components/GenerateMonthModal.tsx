'use client'

import { useState } from 'react'
import { createDataClient } from '@/app/lib/supabase'
import { X } from 'lucide-react'

type Props = {
  clientId: string
  clientName: string
  monthRef: string
  onClose: () => void
  onSuccess: () => void
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

const getDayName = (date: Date) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
  return days[date.getDay()]
}

export default function GenerateMonthModal({ clientId, clientName, monthRef, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [year, month] = monthRef.split('-').map(Number)
  const totalDays = getDaysInMonth(year, month)

  const handleGenerate = async () => {
    setLoading(true)
    const supabase = createDataClient()

    // Criar ou buscar month_list
    let monthListId: string

    const { data: existing } = await supabase
      .from('month_lists')
      .select('id')
      .eq('client_id', clientId)
      .eq('month_ref', monthRef)
      .single()

    if (existing) {
      monthListId = existing.id
    } else {
      const { data: newList } = await supabase
        .from('month_lists')
        .insert({ client_id: clientId, month_ref: monthRef, year })
        .select('id')
        .single()
      if (!newList) { setLoading(false); return }
      monthListId = newList.id
    }

    // Criar entradas para cada dia
    const entries = []
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      entries.push({
        month_list_id: monthListId,
        client_id: clientId,
        entry_date: dateStr,
        dia_semana: getDayName(date),
      })
    }

    await supabase.from('day_entries').upsert(entries, { onConflict: 'month_list_id,entry_date' })

    setLoading(false)
    onSuccess()
  }

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Gerar planejamento do mês</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-zinc-800 rounded-xl p-4 mb-6">
          <p className="text-zinc-400 text-sm mb-1">Serão criados</p>
          <p className="text-white text-2xl font-bold">{totalDays} dias</p>
          <p className="text-zinc-400 text-sm mt-1">
            para <span className="text-white font-medium">{clientName}</span> — {monthNames[month - 1]} {year}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-4 py-3 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-black font-semibold px-4 py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>
    </div>
  )
}