ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_seen_tour     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;
