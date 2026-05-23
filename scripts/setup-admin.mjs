/**
 * Script de setup inicial — rode UMA vez no terminal do projeto:
 *   node scripts/setup-admin.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const SUPABASE_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const ADMIN_UUID       = 'f4524721-d94e-41f5-a699-045a79559d23'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function run() {
  console.log('\n🔧 Ráfia Co.lab — Setup inicial\n')

  // 1. Verifica/cria/corrige perfil do admin
  console.log('1. Verificando perfil do admin...')
  const { data: existing } = await supabase
    .from('users_profile')
    .select('id, name, role, client_id')
    .eq('id', ADMIN_UUID)
    .single()

  if (!existing) {
    const { error } = await supabase.from('users_profile').insert({ id: ADMIN_UUID, name: 'Admin', role: 'admin' })
    if (error) { console.error('   ❌ Erro ao criar perfil:', error.message); process.exit(1) }
    console.log('   ✅ Perfil admin criado.')
  } else if (existing.role !== 'admin') {
    const { error } = await supabase.from('users_profile').update({ role: 'admin' }).eq('id', ADMIN_UUID)
    if (error) { console.error('   ❌ Erro ao atualizar role:', error.message); process.exit(1) }
    console.log(`   ✅ Role corrigido: ${existing.role} → admin`)
  } else {
    console.log(`   ✅ OK — já é admin (nome: ${existing.name})`)
  }

  // 2. Verifica coluna client_id
  console.log('\n2. Verificando coluna client_id...')
  const { error: selectErr } = await supabase
    .from('users_profile').select('client_id').eq('id', ADMIN_UUID).limit(1)
  if (selectErr?.message?.includes('client_id')) {
    console.error('   ❌ Coluna client_id não existe. Execute no Supabase SQL Editor:')
    console.error('   ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;')
  } else {
    console.log('   ✅ Coluna client_id OK.')
  }

  // 3. Lista clientes
  console.log('\n3. Clientes cadastrados:')
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')
  if (!clients?.length) {
    console.log('   ⚠️  Nenhum cliente ainda.')
  } else {
    for (const c of clients) console.log(`   • ${c.name}  (${c.id})`)
  }

  console.log('\n✅ Pronto! Acesse http://localhost:3000\n')
}

run().catch(e => { console.error('Erro:', e.message); process.exit(1) })
