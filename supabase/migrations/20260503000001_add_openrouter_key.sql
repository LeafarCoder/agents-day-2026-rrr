ALTER TABLE users
  ADD COLUMN IF NOT EXISTS openrouter_api_key_encrypted    bytea,
  ADD COLUMN IF NOT EXISTS openrouter_api_key_updated_at   timestamptz;
