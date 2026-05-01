-- =============================================================================
-- Migration 008: Merge accommodation_airbnb + accommodation_hotel → accommodation
-- =============================================================================

-- 1. New unified category
INSERT INTO activity_categories (name) VALUES ('accommodation');

-- 2. Keywords
INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'accommodation airbnb', 'airbnb', 'vacation rental', 'apartment rental',
    'accommodation hotel', 'hotel', 'hostel', 'resort', 'bed and breakfast'
]) FROM activity_categories WHERE name = 'accommodation';

-- 3. Preference entries for the new category
INSERT INTO preferences (category_id, activity_keyword_id)
SELECT k.category_id, k.id
FROM activity_keywords k
JOIN activity_categories c ON k.category_id = c.id
WHERE c.name = 'accommodation';

-- 4. Re-point user_preferences to the new preference entries
--    Match on keyword text so each row lands on the right new preference.
UPDATE user_preferences up
SET preference_id = new_p.id
FROM preferences old_p
JOIN activity_keywords old_kw ON old_p.activity_keyword_id = old_kw.id
JOIN activity_categories old_c  ON old_p.category_id = old_c.id
JOIN activity_keywords new_kw   ON new_kw.keyword = old_kw.keyword
JOIN activity_categories new_c  ON new_kw.category_id = new_c.id AND new_c.name = 'accommodation'
JOIN preferences new_p          ON new_p.activity_keyword_id = new_kw.id
WHERE up.preference_id = old_p.id
  AND old_c.name IN ('accommodation_airbnb', 'accommodation_hotel');

-- 5. Drop old preferences rows (keywords not shared with new category)
DELETE FROM preferences
WHERE category_id IN (
    SELECT id FROM activity_categories WHERE name IN ('accommodation_airbnb', 'accommodation_hotel')
);

-- 6. Drop old keywords
DELETE FROM activity_keywords
WHERE category_id IN (
    SELECT id FROM activity_categories WHERE name IN ('accommodation_airbnb', 'accommodation_hotel')
);

-- 7. Drop old categories
DELETE FROM activity_categories
WHERE name IN ('accommodation_airbnb', 'accommodation_hotel');
