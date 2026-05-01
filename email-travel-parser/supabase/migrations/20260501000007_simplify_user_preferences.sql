-- =============================================================================
-- Migration 003: Simplify user_preferences — remove redundant preferences table
-- user_preferences now references activity_keywords directly (which already
-- carries category_id, making the preferences bridge table unnecessary).
-- =============================================================================

ALTER TABLE user_preferences
    DROP CONSTRAINT IF EXISTS user_preferences_preference_id_fkey,
    DROP CONSTRAINT IF EXISTS user_preferences_user_id_preference_id_key;

ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS activity_keyword_id uuid REFERENCES activity_keywords (id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS idx_user_preferences_preference_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_keyword
    ON user_preferences (user_id, activity_keyword_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_keyword_id
    ON user_preferences (activity_keyword_id);

ALTER TABLE user_preferences DROP COLUMN IF EXISTS preference_id;

DROP TABLE IF EXISTS preferences;
