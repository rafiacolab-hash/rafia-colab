import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  // Verifica se é admin
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await serviceClient
    .from('users_profile').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Cria a tabela via RPC (exec sql com service role)
  const sql = `
    CREATE TABLE IF NOT EXISTS activity_log (
      id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id     UUID        NOT NULL,
      user_name   TEXT        NOT NULL,
      action_type TEXT        NOT NULL CHECK (action_type IN ('status_change', 'content_edit')),
      entry_id    UUID        NOT NULL,
      client_id   UUID        NOT NULL,
      client_name TEXT        NOT NULL DEFAULT '',
      entry_date  DATE        NOT NULL,
      field       TEXT        NOT NULL,
      old_value   TEXT,
      new_value   TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id    ON activity_log (user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_client_id  ON activity_log (client_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_log_action     ON activity_log (action_type);

    ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_insert'
      ) THEN
        EXECUTE 'CREATE POLICY activity_insert ON activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_admin_select'
      ) THEN
        EXECUTE $p$CREATE POLICY activity_admin_select ON activity_log FOR SELECT USING (
          EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = ''admin'')
        )$p$;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_own_select'
      ) THEN
        EXECUTE 'CREATE POLICY activity_own_select ON activity_log FOR SELECT USING (user_id = auth.uid())';
      END IF;
    END $$;
  `

  const { error } = await serviceClient.rpc('exec_sql', { sql })

  if (error) {
    // Se exec_sql não existir, tenta via query direta
    // Tabela pode já existir (IF NOT EXISTS) — verifica
    const { error: checkError } = await serviceClient
      .from('activity_log').select('id').limit(1)

    if (!checkError) {
      return NextResponse.json({ ok: true, message: 'Tabela já existe.' })
    }

    return NextResponse.json(
      { error: 'Não foi possível criar a tabela. Execute o SQL manualmente no Supabase.', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, message: 'Tabela activity_log criada com sucesso.' })
}

export async function GET() {
  // Verifica se a tabela existe (sem precisar de service role)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await serviceClient.from('activity_log').select('id').limit(1)
  return NextResponse.json({ exists: !error, error: error?.message })
}
