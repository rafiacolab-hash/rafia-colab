/**
 * import-csv.mjs — Importa planilhas de planejamento de Social Media para o Supabase
 *
 * Uso: node scripts/import-csv.mjs
 *
 * Mapeamentos aplicados (confirmados pelo usuário):
 *   Agendado  → POSTADO
 *   Aprovado  → VALIDACAO
 *   Aguardando → AGUARDANDO
 *   Postado   → POSTADO
 *   (vazio)   → null
 *
 *   Status único (uma coluna) → aplica em stories_status, feed_status e acoes_status
 *   ZNG "Stories Ação"        → concatenar com "Stories" no stories_content
 *   ZNG "Ações"               → acoes_content
 *   Clickup                   → ignorado
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://sbqefuorlrcaxqciylkr.supabase.co'
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicWVmdW9ybHJjYXhxY2l5bGtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUzMzA0OSwiZXhwIjoyMDk1MTA5MDQ5fQ.Z74ra4gy-0kn1-nF8pjPCnicjcfgMjNgkRotx5gvKXY'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Mapeamento de status CSV → sistema ───────────────────────────────────────
const STATUS_MAP = {
  'postado':    'POSTADO',
  'agendado':   'POSTADO',
  'aprovado':   'VALIDACAO',
  'aguardando': 'AGUARDANDO',
  'a fazer':    'A_FAZER',
  'andamento':  'ANDAMENTO',
  'em andamento': 'ANDAMENTO',
  'correção':   'CORRECAO',
  'correcao':   'CORRECAO',
  'cancelado':  'CANCELADO',
}

function mapStatus(raw) {
  if (!raw || !raw.trim()) return null
  return STATUS_MAP[raw.trim().toLowerCase()] ?? null
}

// ─── Parser de CSV simples (sem dependência externa) ─────────────────────────
function parseCSV(filepath) {
  const content = readFileSync(filepath, 'utf-8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove BOM
    .replace(/^﻿/, '')

  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length === 0) return []

  // Parser que respeita campos entre aspas com vírgulas internas
  function parseLine(line) {
    const result = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(field)
        field = ''
      } else {
        field += ch
      }
    }
    result.push(field)
    return result.map(f => f.trim())
  }

  const headers = parseLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

// ─── Converte DD/MM/YYYY → YYYY-MM-DD ────────────────────────────────────────
function parseDate(raw) {
  if (!raw || !raw.trim()) return null
  const parts = raw.trim().split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ─── Extrai mês de uma lista de linhas ───────────────────────────────────────
function extractMonthRef(rows) {
  for (const row of rows) {
    const d = parseDate(row['Dia'])
    if (d) return d.slice(0, 7) // YYYY-MM
  }
  return null
}

// ─── Dia da semana em pt-BR → abreviatura ────────────────────────────────────
const SEMANA_MAP = {
  'domingo': 'Dom', 'segunda-feira': 'Seg', 'segunda': 'Seg',
  'terça-feira': 'Ter', 'terca-feira': 'Ter', 'terça': 'Ter', 'terca': 'Ter',
  'quarta-feira': 'Qua', 'quarta': 'Qua',
  'quinta-feira': 'Qui', 'quinta': 'Qui',
  'sexta-feira': 'Sex', 'sexta': 'Sex',
  'sábado': 'Sáb', 'sabado': 'Sáb',
}
function mapSemana(raw) {
  if (!raw) return ''
  return SEMANA_MAP[raw.trim().toLowerCase()] ?? raw.trim().slice(0, 3)
}

// ─── Processa um arquivo CSV e retorna rows prontas para upsert ───────────────
function processCSV(filepath, isZNG = false) {
  const rows = parseCSV(filepath)
  const entries = []

  for (const row of rows) {
    const entry_date = parseDate(row['Dia'])
    if (!entry_date) continue

    let stories_content = row['Stories']?.trim() || null
    let feed_content    = row['Feed']?.trim()    || null
    let acoes_content   = null
    let stories_status  = null
    let feed_status     = null
    let acoes_status    = null

    if (isZNG) {
      // ZNG: "Stories Ação" concatena com Stories
      const storiesAcao = row['Stories Ação ']?.trim() || row['Stories Ação']?.trim() || ''
      if (storiesAcao) {
        stories_content = [stories_content, storiesAcao].filter(Boolean).join('\n') || null
      }
      acoes_content  = row['Ações ']?.trim() || row['Ações']?.trim() || null
      stories_status = mapStatus(row['Status Story'])
      feed_status    = mapStatus(row['Status Feed'])
      acoes_status   = stories_status ?? feed_status // melhor estimativa
    } else {
      // Arquivos com uma única coluna Status
      const status = mapStatus(row['Status'])
      stories_status = status
      feed_status    = status
      acoes_status   = status
    }

    const dia_semana   = mapSemana(row['Semana'])
    const legenda_copy = row['Legenda']?.trim()   || null
    const arte_link    = row['Arte/Link']?.trim() || null
    const observacoes  = row['Observações']?.trim() || row['Observações']?.trim() || null

    entries.push({
      entry_date,
      dia_semana,
      stories_content,
      stories_status,
      stories_format: null,
      feed_content,
      feed_status,
      feed_format: null,
      acoes_content,
      acoes_status,
      acoes_format: null,
      legenda_copy,
      arte_link,
      observacoes,
    })
  }

  return entries
}

// ─── Busca ou cria client por nome ───────────────────────────────────────────
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4']
let colorIdx = 0

async function findOrCreateClient(name) {
  // Busca ignorando case e variações de espaço
  const { data: clients } = await supabase.from('clients').select('id, name')
  const match = clients?.find(c =>
    c.name.toLowerCase().trim() === name.toLowerCase().trim()
  )
  if (match) {
    console.log(`  → Cliente encontrado: "${match.name}" (${match.id})`)
    return match.id
  }

  // Cria novo cliente
  const color = COLORS[colorIdx++ % COLORS.length]
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, color })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao criar cliente "${name}": ${error.message}`)
  console.log(`  → Cliente CRIADO: "${name}" (${data.id}) cor=${color}`)
  return data.id
}

// ─── Busca ou cria month_list ─────────────────────────────────────────────────
async function findOrCreateMonthList(clientId, monthRef) {
  const year = parseInt(monthRef.split('-')[0])

  const { data: existing } = await supabase
    .from('month_lists')
    .select('id')
    .eq('client_id', clientId)
    .eq('month_ref', monthRef)
    .single()

  if (existing) {
    console.log(`  → month_list já existe: ${monthRef} (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('month_lists')
    .insert({ client_id: clientId, month_ref: monthRef, year })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao criar month_list ${monthRef}: ${error.message}`)
  console.log(`  → month_list CRIADO: ${monthRef} (${data.id})`)
  return data.id
}

// ─── Importa um arquivo ───────────────────────────────────────────────────────
async function importFile(label, filepath, clientName, isZNG = false) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`📂 ${label}`)
  console.log(`   Arquivo: ${filepath}`)

  if (!existsSync(filepath)) {
    console.log(`   ⚠️  Arquivo não encontrado, pulando.`)
    return
  }

  const entries = processCSV(filepath, isZNG)
  if (entries.length === 0) {
    console.log(`   ⚠️  Nenhuma linha válida encontrada, pulando.`)
    return
  }

  const monthRef = entries.find(e => e.entry_date)?.entry_date?.slice(0, 7)
  if (!monthRef) {
    console.log(`   ⚠️  Não foi possível determinar o mês, pulando.`)
    return
  }

  const withContent = entries.filter(e =>
    e.stories_content || e.feed_content || e.acoes_content ||
    e.stories_status  || e.feed_status  || e.acoes_status  ||
    e.legenda_copy    || e.arte_link    || e.observacoes
  )
  console.log(`   Mês: ${monthRef} | ${entries.length} dias | ${withContent.length} com conteúdo`)

  // Cliente
  const clientId = await findOrCreateClient(clientName)

  // Verifica se já tem entradas neste mês
  const { count } = await supabase
    .from('day_entries')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('entry_date', `${monthRef}-01`)
    .lte('entry_date', `${monthRef}-31`)

  if (count > 0) {
    console.log(`   ℹ️  Já existem ${count} entradas para ${monthRef} — fazendo upsert (atualiza sem apagar)`)
  }

  // month_list
  const monthListId = await findOrCreateMonthList(clientId, monthRef)

  // Prepara rows com IDs de referência
  const rows = entries.map(e => ({
    ...e,
    month_list_id: monthListId,
    client_id: clientId,
    updated_at: new Date().toISOString(),
  }))

  // Upsert em lotes de 50
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('day_entries')
      .upsert(batch, { onConflict: 'month_list_id,entry_date' })
    if (error) throw new Error(`Erro ao upsert batch ${i}: ${error.message}`)
    inserted += batch.length
  }

  console.log(`   ✅ ${inserted} entradas importadas/atualizadas com sucesso.`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// CSVs estão na pasta scripts/data/ (relativo ao diretório do script)
const DATA_DIR = resolve(__dirname, 'data')

const FILES = [
  {
    label: 'Perfect Glam — Janeiro 2026',
    filepath: resolve(DATA_DIR, 'Perfect Glam - Janeiro.csv'),
    clientName: 'Perfect Glam',
    isZNG: false,
  },
  {
    label: 'Ráfia Co.lab — Março 2026',
    filepath: resolve(DATA_DIR, 'Rafia CoLab - Marco.csv'),
    clientName: 'Ráfia Co.lab',
    isZNG: false,
  },
  {
    label: 'Maithë Shoes — Março 2026',
    filepath: resolve(DATA_DIR, 'Maithe Shoes - Marco.csv'),
    clientName: 'Maithë Shoes',
    isZNG: false,
  },
  {
    label: 'Mari Telli — Março 2026',
    filepath: resolve(DATA_DIR, 'Mari Telli - Marco.csv'),
    clientName: 'Mari Telli',
    isZNG: false,
  },
  {
    label: 'ZNG — Março 2026',
    filepath: resolve(DATA_DIR, 'ZNG - Marco.csv'),
    clientName: 'ZNG',
    isZNG: true,
  },
]

console.log('🚀 Iniciando importação de planilhas de Social Media')
console.log(`📅 ${new Date().toLocaleString('pt-BR')}`)

let totalOk = 0
let totalErr = 0

for (const f of FILES) {
  try {
    await importFile(f.label, f.filepath, f.clientName, f.isZNG)
    totalOk++
  } catch (err) {
    console.error(`\n❌ ERRO em "${f.label}": ${err.message}`)
    totalErr++
  }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`✅ Importados: ${totalOk} | ❌ Erros: ${totalErr}`)
console.log('Importação concluída.')
