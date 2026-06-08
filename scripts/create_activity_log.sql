-- ─── activity_log ────────────────────────────────────────────────────────────
-- Tabela para rastrear ações dos assistentes (mudanças de status e edições de conteúdo)
-- Execute este script no Supabase > SQL Editor

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

-- Índices para queries do dashboard
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id     ON activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client_id   ON activity_log (client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at  ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log (action_type);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir seus próprios registros
CREATE POLICY "authenticated_insert" ON activity_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins leem tudo
CREATE POLICY "admin_select_all" ON activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Assistentes leem apenas os próprios registros
CREATE POLICY "user_select_own" ON activity_log
  FOR SELECT
  USING (user_id = auth.uid());
