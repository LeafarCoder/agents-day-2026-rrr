-- Per-user Gmail label exclusions.
-- Defaults to the four standard Gmail categories so existing behaviour is preserved.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS excluded_gmail_labels text[] NOT NULL DEFAULT '{promotions,spam,social,forums}';
