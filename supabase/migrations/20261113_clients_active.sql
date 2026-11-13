-- Cliente ativo/inativo: inativos ficam numa seção separada da sidebar e fora do dashboard.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clients.active IS
  'Cliente ativo (true) ou inativo (false). Inativos ficam em seção separada na sidebar e fora do dashboard.';
