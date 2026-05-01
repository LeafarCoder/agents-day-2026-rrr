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

-- 3. Re-point user_preferences that matched old accommodation keywords to new entries
UPDATE user_preferences up
SET activity_keyword_id = new_kw.id
FROM activity_keywords old_kw
JOIN activity_categories old_c ON old_kw.category_id = old_c.id
    AND old_c.name IN ('accommodation_airbnb', 'accommodation_hotel')
JOIN activity_categories new_c ON new_c.name = 'accommodation'
JOIN activity_keywords new_kw  ON new_kw.category_id = new_c.id AND new_kw.keyword = old_kw.keyword
WHERE up.activity_keyword_id = old_kw.id;

-- 4. Delete remaining user_preferences still pointing to old accommodation keywords
DELETE FROM user_preferences
WHERE activity_keyword_id IN (
    SELECT kw.id FROM activity_keywords kw
    JOIN activity_categories c ON kw.category_id = c.id
    WHERE c.name IN ('accommodation_airbnb', 'accommodation_hotel')
);

-- 5. Drop old keywords
DELETE FROM activity_keywords
WHERE category_id IN (
    SELECT id FROM activity_categories WHERE name IN ('accommodation_airbnb', 'accommodation_hotel')
);

-- 6. Drop old categories
DELETE FROM activity_categories
WHERE name IN ('accommodation_airbnb', 'accommodation_hotel');
