-- =============================================================================
-- Migration 009: Replace flight category → transportation (expanded keywords)
-- =============================================================================

-- 1. New category
INSERT INTO activity_categories (name) VALUES ('transportation');

-- 2. Keywords
INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'flight', 'e-ticket', 'boarding', 'itinerary',
    'budget flight', 'business class', 'first class', 'economy class',
    'train', 'rail', 'eurostar', 'bus', 'coach',
    'ferry', 'cruise', 'car rental', 'taxi', 'transfer', 'shuttle', 'tuk-tuk'
]) FROM activity_categories WHERE name = 'transportation';

-- 3. Re-point user_preferences that matched old flight keywords to new transportation keyword entries
UPDATE user_preferences up
SET activity_keyword_id = new_kw.id
FROM activity_keywords old_kw
JOIN activity_categories old_c ON old_kw.category_id = old_c.id AND old_c.name = 'flight'
JOIN activity_categories new_c ON new_c.name = 'transportation'
JOIN activity_keywords new_kw  ON new_kw.category_id = new_c.id AND new_kw.keyword = old_kw.keyword
WHERE up.activity_keyword_id = old_kw.id;

-- 4. Delete any remaining user_preferences still pointing to flight keywords
--    (keywords that have no matching transportation keyword, e.g. none here, but safe to have)
DELETE FROM user_preferences
WHERE activity_keyword_id IN (
    SELECT kw.id FROM activity_keywords kw
    JOIN activity_categories c ON kw.category_id = c.id AND c.name = 'flight'
);

-- 5. Drop old keywords and category
DELETE FROM activity_keywords
WHERE category_id = (SELECT id FROM activity_categories WHERE name = 'flight');

DELETE FROM activity_categories WHERE name = 'flight';
