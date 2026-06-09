import { createDataClient } from '@/app/lib/supabase'

export type DayEntryStatus =
  | 'A_FAZER' | 'ANDAMENTO' | 'AGUARDANDO'
  | 'CORRECAO' | 'AGENDADO' | 'CONCLUIDO'
  | 'POSTADO' | 'CANCELADO'
  | null

export type DayEntry = {
  id: string
  month_list_id: string
  client_id: string
  entry_date: string
  dia_semana: string
  mes_ref?: string | null
  stories_content: string | null
  stories_status: DayEntryStatus
  stories_format: string | null
  feed_content: string | null
  feed_status: DayEntryStatus
  feed_format: string | null
  acoes_content: string | null
  acoes_status: DayEntryStatus
  acoes_format: string | null
  legenda_copy: string | null
  arte_link: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export async function getEntriesByClientAndMonth(
  clientId: string,
  monthRef: string
): Promise<DayEntry[]> {
  console.log('[entries] getEntriesByClientAndMonth chamado', { clientId, monthRef })
  // createDataClient lê o token do cookie — sem getSession(), sem lock de auth
  const supabase = createDataClient()

  // Calcula o último dia real do mês (evita datas inválidas como 2026-06-31)
  const [year, month] = monthRef.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const lastDate = `${monthRef}-${String(lastDay).padStart(2, '0')}`

  // Filtra por entry_date range (YYYY-MM-01 até último dia real do mês)
  const { data, error } = await supabase
    .from('day_entries')
    .select('*')
    .eq('client_id', clientId)
    .gte('entry_date', `${monthRef}-01`)
    .lte('entry_date', lastDate)
    .order('entry_date', { ascending: true })

  console.log('[entries] resposta Supabase', { data, error })

  if (error) {
    console.error('[entries] erro ao buscar entries:', error)
    throw error
  }
  return data || []
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export async function generateMonthEntries(
  clientId: string,
  monthRef: string,
  monthListId: string
): Promise<void> {
  const supabase = createDataClient()
  const [year, month] = monthRef.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const entries = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month - 1, i + 1)
    return {
      month_list_id: monthListId,
      client_id: clientId,
      entry_date: date.toISOString().split('T')[0],
      dia_semana: DAYS[date.getDay()],
      stories_status: 'A_FAZER',
      feed_status: 'A_FAZER',
      acoes_status: 'A_FAZER',
    }
  })

  const { error } = await supabase.from('day_entries').insert(entries)
  if (error) throw error
}
