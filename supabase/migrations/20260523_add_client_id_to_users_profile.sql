-- Adiciona vínculo entre usuário (role=client) e o cliente que ele representa
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Índice para lookups eficientes
CREATE INDEX IF NOT EXISTS idx_users_profile_client_id ON users_profile(client_id);

-- Comentário
COMMENT ON COLUMN users_profile.client_id IS
  'Para usuários com role=client: referência ao cliente cujos dados esse usuário pode visualizar.';
