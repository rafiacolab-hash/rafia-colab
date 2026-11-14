-- Retrato diário de seguidores/posts por cliente (para curva de crescimento e comparação entre meses).
-- Preenchido pela rotina diária e sempre que a aba Métricas é aberta. Somente service_role.
CREATE TABLE IF NOT EXISTS public.instagram_daily_snapshots (
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  snap_date   DATE NOT NULL,
  followers   INTEGER NOT NULL,
  follows     INTEGER,
  media_count INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, snap_date)
);

ALTER TABLE public.instagram_daily_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_daily_snapshots FROM anon, authenticated;
GRANT ALL ON public.instagram_daily_snapshots TO service_role;
