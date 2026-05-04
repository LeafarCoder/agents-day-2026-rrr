-- Mark individual emails as excluded from travel DNA analysis
-- (false positive bookings, advertisements, etc.)
-- We keep the row and llm_extraction so we don't re-process with the LLM.
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS is_excluded boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS emails_user_not_excluded
  ON emails (user_id, is_excluded)
  WHERE is_excluded = false;
