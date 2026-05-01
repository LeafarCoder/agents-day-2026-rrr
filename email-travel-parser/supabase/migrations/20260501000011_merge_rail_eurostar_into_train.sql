-- =============================================================================
-- Migration 011: Merge 'rail' and 'eurostar' keywords into 'train'
-- =============================================================================

DO $$
DECLARE
    v_cat_id   uuid;
    v_train_id uuid;
    v_rail_id  uuid;
    v_euro_id  uuid;
BEGIN
    SELECT id INTO v_cat_id   FROM activity_categories WHERE name = 'transportation';
    SELECT id INTO v_train_id FROM activity_keywords    WHERE keyword = 'train'    AND category_id = v_cat_id;
    SELECT id INTO v_rail_id  FROM activity_keywords    WHERE keyword = 'rail'     AND category_id = v_cat_id;
    SELECT id INTO v_euro_id  FROM activity_keywords    WHERE keyword = 'eurostar' AND category_id = v_cat_id;

    -- Add rail/eurostar counts to existing train preferences
    UPDATE user_preferences up
    SET count = up.count
        + COALESCE((SELECT count FROM user_preferences WHERE user_id = up.user_id AND activity_keyword_id = v_rail_id),  0)
        + COALESCE((SELECT count FROM user_preferences WHERE user_id = up.user_id AND activity_keyword_id = v_euro_id), 0)
    WHERE up.activity_keyword_id = v_train_id;

    -- Create train preference for users who had rail/eurostar but no train row
    INSERT INTO user_preferences (user_id, activity_keyword_id, intensity, count, source, updated_at)
    SELECT
        up.user_id,
        v_train_id,
        up.intensity,
        SUM(up.count),
        up.source,
        now()
    FROM user_preferences up
    WHERE up.activity_keyword_id IN (v_rail_id, v_euro_id)
      AND NOT EXISTS (
          SELECT 1 FROM user_preferences
          WHERE user_id = up.user_id AND activity_keyword_id = v_train_id
      )
    GROUP BY up.user_id, up.intensity, up.source
    ON CONFLICT (user_id, activity_keyword_id) DO NOTHING;

    -- Remove rail/eurostar preference rows and keywords
    DELETE FROM user_preferences WHERE activity_keyword_id IN (v_rail_id, v_euro_id);
    DELETE FROM activity_keywords  WHERE id IN (v_rail_id, v_euro_id);
END $$;
