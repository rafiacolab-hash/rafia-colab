-- Conta do Instagram vinculada a cada cliente (para a aba Métricas).
-- O access_token é sensível: a tabela NÃO tem policies de RLS, então
-- usuários logados (anon/authenticated) não conseguem ler nem escrever.
-- Só as rotas de servidor (service_role) acessam.

CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  client_id        UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  ig_user_id       TEXT,
  username         TEXT,
  access_token     TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  last_refresh_at  TIMESTAMPTZ,
  last_error       TEXT,
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.instagram_accounts FROM anon, authenticated;
GRANT ALL ON public.instagram_accounts TO service_role;

COMMENT ON TABLE public.instagram_accounts IS
  'Token da API do Instagram por cliente. Somente service_role (rotas /api/instagram/*).';
