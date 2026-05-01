-- =============================================================================
-- Migration 004: Compatibility for user_preferences schema variants
-- =============================================================================
--
-- Some environments use user_preferences(preference_id), others use
-- user_preferences(activity_keyword_id). This migration keeps both setups
-- operable and ensures preferences exists when needed by legacy writers.

CREATE TABLE IF NOT EXISTS preferences (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         uuid NOT NULL REFERENCES activity_categories (id) ON DELETE RESTRICT,
    activity_keyword_id uuid NOT NULL REFERENCES activity_keywords (id) ON DELETE RESTRICT,
    UNIQUE (category_id, activity_keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_preferences_category_id
    ON preferences (category_id);
CREATE INDEX IF NOT EXISTS idx_preferences_activity_keyword_id
    ON preferences (activity_keyword_id);

INSERT INTO preferences (category_id, activity_keyword_id)
SELECT k.category_id, k.id
FROM activity_keywords k
LEFT JOIN preferences p
    ON p.category_id = k.category_id
   AND p.activity_keyword_id = k.id
WHERE p.id IS NULL;
