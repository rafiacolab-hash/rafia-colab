-- ─── activity_log — VERSÃO LIMPA ─────────────────────────────────────────────
-- Apaga tudo que existir antes e recria do zero.
-- Execute no Supabase > SQL Editor

-- 1. Remove tabela anterior (e tudo que depende dela)
DROP TABLE IF EXISTS activity_log CASCADE;

-- 2. Cria a tabela
CREATE TABLE activity_log (
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

-- 3. Índices
CREATE INDEX idx_activity_log_user_id    ON activity_log (user_id);
CREATE INDEX idx_activity_log_client_id  ON activity_log (client_id);
CREATE INDEX idx_activity_log_created_at ON activity_log (created_at DESC);
CREATE INDEX idx_activity_log_action     ON activity_log (action_type);

-- 4. RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode inserir
CREATE POLICY "activity_insert" ON activity_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins leem tudo
CREATE POLICY "activity_admin_select" ON activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cada usuário lê apenas os próprios logs
CREATE POLICY "activity_own_select" ON activity_log
  FOR SELECT
  USING (user_id = auth.uid());

-- 5. Permissões de acesso (OBRIGATÓRIO — sem isso a tabela fica inacessível via PostgREST)
GRANT SELECT, INSERT ON public.activity_log TO anon;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
