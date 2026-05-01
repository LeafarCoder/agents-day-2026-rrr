-- =============================================================================
-- Migration 002: Seed Activity Categories and Keywords
-- Mirrors the ACTIVITY_SIGNALS dict in scraper.py — keep both in sync.
-- =============================================================================

INSERT INTO activity_categories (name) VALUES
    ('food_dining'),
    ('culture_history'),
    ('adventure_outdoor'),
    ('nightlife'),
    ('wellness'),
    ('sightseeing'),
    ('accommodation_airbnb'),
    ('accommodation_hotel'),
    ('flight'),
    ('cuisine');

-- -----------------------------------------------------------------------------
-- Keywords per category
-- -----------------------------------------------------------------------------

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'food tour', 'cooking class', 'restaurant', 'dinner',
    'tasting', 'wine tour', 'culinary', 'food experience'
]) FROM activity_categories WHERE name = 'food_dining';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'museum', 'historical', 'walking tour', 'heritage',
    'architecture', 'art tour', 'cultural', 'old town'
]) FROM activity_categories WHERE name = 'culture_history';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'hiking', 'trekking', 'kayak', 'surf', 'scuba',
    'climbing', 'safari', 'zip line', 'rafting', 'cycling tour'
]) FROM activity_categories WHERE name = 'adventure_outdoor';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'nightlife tour', 'bar crawl', 'pub crawl', 'rooftop bar', 'cocktail'
]) FROM activity_categories WHERE name = 'nightlife';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'spa', 'yoga retreat', 'meditation', 'wellness', 'massage'
]) FROM activity_categories WHERE name = 'wellness';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'city tour', 'sightseeing', 'bus tour', 'boat tour',
    'sunset cruise', 'day trip', 'excursion'
]) FROM activity_categories WHERE name = 'sightseeing';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'airbnb', 'vacation rental', 'apartment rental'
]) FROM activity_categories WHERE name = 'accommodation_airbnb';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'hotel', 'hostel', 'resort', 'bed and breakfast'
]) FROM activity_categories WHERE name = 'accommodation_hotel';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'flight', 'e-ticket', 'boarding', 'itinerary'
]) FROM activity_categories WHERE name = 'flight';

INSERT INTO activity_keywords (category_id, keyword)
SELECT id, unnest(ARRAY[
    'italian', 'japanese', 'mexican', 'indian', 'chinese',
    'thai', 'french', 'spanish', 'portuguese', 'greek',
    'moroccan', 'vietnamese', 'korean', 'american', 'mediterranean'
]) FROM activity_categories WHERE name = 'cuisine';

-- -----------------------------------------------------------------------------
-- Populate preferences catalog from all seeded keywords
-- Each (category, keyword) pair becomes one preference entry.
-- -----------------------------------------------------------------------------

INSERT INTO preferences (category_id, activity_keyword_id)
SELECT k.category_id, k.id
FROM activity_keywords k;
