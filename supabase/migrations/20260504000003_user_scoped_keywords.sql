-- =============================================================================
-- Per-user activity vocabulary.
--
-- Each user gets their own copy of activity_categories and activity_keywords
-- seeded from the application defaults (via seed_user_keywords in db/writer.py).
-- Users can then evolve their personal vocabulary without affecting anyone else.
--
-- Replaces the users.custom_signals JSONB delta approach: existing users have
-- their effective vocabulary (defaults minus removals plus extras) migrated into
-- first-class rows. user_preferences.activity_keyword_id is re-pointed from
-- old global keyword IDs to each user's personal keyword IDs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add nullable user_id columns
-- ---------------------------------------------------------------------------

ALTER TABLE activity_categories
    ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE activity_keywords
    ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old global UNIQUE(name) constraint before backfilling, otherwise
-- inserting a personal copy of 'food_dining' for each user would conflict with
-- the existing global row that has the same name.
ALTER TABLE activity_categories DROP CONSTRAINT IF EXISTS activity_categories_name_key;

-- ---------------------------------------------------------------------------
-- 2. Backfill: create per-user copies of categories + keywords
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _kw_remap (
    user_id   uuid NOT NULL,
    old_kw_id uuid NOT NULL,
    new_kw_id uuid NOT NULL
);

DO $$
DECLARE
    u          RECORD;
    cat        RECORD;
    kw         RECORD;
    extra_pair RECORD;
    removed    JSONB;
    new_cat_id uuid;
    new_kw_id  uuid;
    extra_kw   text;
BEGIN
    FOR u IN SELECT id, coalesce(custom_signals, '{}'::jsonb) AS cs FROM users LOOP
        removed := coalesce(u.cs -> '__removed__', '{}'::jsonb);

        -- ── Copy each global category ─────────────────────────────────────
        FOR cat IN SELECT id, name FROM activity_categories WHERE user_id IS NULL LOOP
            INSERT INTO activity_categories(user_id, name)
            VALUES (u.id, cat.name)
            RETURNING id INTO new_cat_id;

            -- Copy keywords that the user has not removed
            FOR kw IN SELECT id, keyword FROM activity_keywords
                      WHERE category_id = cat.id AND user_id IS NULL LOOP
                IF (removed -> cat.name) IS NULL
                   OR NOT ((removed -> cat.name) ? kw.keyword)
                THEN
                    INSERT INTO activity_keywords(user_id, category_id, keyword)
                    VALUES (u.id, new_cat_id, kw.keyword)
                    RETURNING id INTO new_kw_id;

                    INSERT INTO _kw_remap(user_id, old_kw_id, new_kw_id)
                    VALUES (u.id, kw.id, new_kw_id);
                END IF;
            END LOOP;

            -- Add any extra keywords the user added to this default category
            IF u.cs ? cat.name THEN
                FOR extra_kw IN SELECT jsonb_array_elements_text(u.cs -> cat.name) LOOP
                    IF NOT EXISTS (
                        SELECT 1 FROM activity_keywords
                        WHERE user_id = u.id AND category_id = new_cat_id AND keyword = extra_kw
                    ) THEN
                        INSERT INTO activity_keywords(user_id, category_id, keyword)
                        VALUES (u.id, new_cat_id, extra_kw);
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

        -- ── Handle user-created categories (not in global defaults) ───────
        FOR extra_pair IN
            SELECT key, value FROM jsonb_each(u.cs)
            WHERE left(key, 2) != '__'
              AND key NOT IN (SELECT name FROM activity_categories WHERE user_id IS NULL)
        LOOP
            INSERT INTO activity_categories(user_id, name)
            VALUES (u.id, extra_pair.key)
            RETURNING id INTO new_cat_id;

            FOR extra_kw IN SELECT jsonb_array_elements_text(extra_pair.value) LOOP
                INSERT INTO activity_keywords(user_id, category_id, keyword)
                VALUES (u.id, new_cat_id, extra_kw);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Re-point user_preferences to personal keyword IDs
-- ---------------------------------------------------------------------------

UPDATE user_preferences up
SET    activity_keyword_id = r.new_kw_id
FROM   _kw_remap r
WHERE  up.user_id = r.user_id
  AND  up.activity_keyword_id = r.old_kw_id;

-- Remove preferences whose keyword was removed by the user (no remap entry)
DELETE FROM user_preferences up
WHERE NOT EXISTS (
    SELECT 1 FROM activity_keywords k
    WHERE k.id = up.activity_keyword_id
);

DROP TABLE _kw_remap;

-- ---------------------------------------------------------------------------
-- 4. Drop global rows
-- ---------------------------------------------------------------------------

DELETE FROM activity_keywords  WHERE user_id IS NULL;
DELETE FROM activity_categories WHERE user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Enforce NOT NULL and add per-user unique constraints
-- ---------------------------------------------------------------------------

ALTER TABLE activity_categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE activity_categories ADD CONSTRAINT activity_categories_user_id_name_key
    UNIQUE (user_id, name);
CREATE INDEX IF NOT EXISTS idx_activity_categories_user_id ON activity_categories (user_id);

ALTER TABLE activity_keywords ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_keywords_user_id ON activity_keywords (user_id);

-- ---------------------------------------------------------------------------
-- 6. Cascade deletes: removing a keyword should clean up preferences
-- ---------------------------------------------------------------------------

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_activity_keyword_id_fkey;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_activity_keyword_id_fkey
    FOREIGN KEY (activity_keyword_id) REFERENCES activity_keywords(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. Drop legacy columns / tables
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS preferences CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS custom_signals;
