-- =============================================================================
-- Migration 010: Add per-keyword occurrence count to user_preferences
-- =============================================================================

ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS count integer;
