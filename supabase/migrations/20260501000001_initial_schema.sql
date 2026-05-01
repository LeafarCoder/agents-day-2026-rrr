-- =============================================================================
-- Migration 001: Initial Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Geography
-- -----------------------------------------------------------------------------

CREATE TABLE countries (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code char(2) NOT NULL UNIQUE
);

CREATE TABLE cities (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    country_id uuid NOT NULL REFERENCES countries (id) ON DELETE RESTRICT,
    UNIQUE (name, country_id)
);

CREATE INDEX idx_cities_country_id ON cities (country_id);

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------

CREATE TABLE users (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                text        NOT NULL UNIQUE,
    created_at           timestamptz NOT NULL DEFAULT now(),
    last_scanned_at      timestamptz,
    oldest_email_scanned timestamptz
);

-- -----------------------------------------------------------------------------
-- Travels
-- -----------------------------------------------------------------------------

CREATE TABLE travels (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    destination_city_id uuid        NOT NULL REFERENCES cities (id) ON DELETE RESTRICT,
    title               text,
    start_date          date,
    end_date            date,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_travels_user_id             ON travels (user_id);
CREATE INDEX idx_travels_destination_city_id ON travels (destination_city_id);

-- -----------------------------------------------------------------------------
-- Emails
-- -----------------------------------------------------------------------------

CREATE TABLE emails (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    gmail_msg_id  text        NOT NULL UNIQUE,
    sender_domain text,
    subject       text        NOT NULL,
    email_date    date,
    travel_id     uuid        REFERENCES travels (id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_emails_user_id   ON emails (user_id);
CREATE INDEX idx_emails_travel_id ON emails (travel_id);
CREATE INDEX idx_emails_email_date ON emails (email_date);

-- -----------------------------------------------------------------------------
-- Activity Categories & Keywords
-- -----------------------------------------------------------------------------

CREATE TABLE activity_categories (
    id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE
);

CREATE TABLE activity_keywords (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES activity_categories (id) ON DELETE CASCADE,
    keyword     text NOT NULL,
    UNIQUE (category_id, keyword)
);

CREATE INDEX idx_activity_keywords_category_id ON activity_keywords (category_id);

-- -----------------------------------------------------------------------------
-- Preferences catalog
-- -----------------------------------------------------------------------------

CREATE TABLE preferences (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         uuid NOT NULL REFERENCES activity_categories (id) ON DELETE RESTRICT,
    activity_keyword_id uuid NOT NULL REFERENCES activity_keywords (id) ON DELETE RESTRICT,
    UNIQUE (category_id, activity_keyword_id)
);

CREATE INDEX idx_preferences_category_id         ON preferences (category_id);
CREATE INDEX idx_preferences_activity_keyword_id ON preferences (activity_keyword_id);

-- -----------------------------------------------------------------------------
-- User Preferences (many-to-many: users ↔ preferences)
-- -----------------------------------------------------------------------------

CREATE TABLE user_preferences (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    preference_id uuid        NOT NULL REFERENCES preferences (id) ON DELETE RESTRICT,
    intensity     text        NOT NULL CHECK (intensity IN ('strong', 'moderate', 'weak')),
    source        text        NOT NULL CHECK (source IN ('inferred', 'manual')),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, preference_id)
);

CREATE INDEX idx_user_preferences_user_id       ON user_preferences (user_id);
CREATE INDEX idx_user_preferences_preference_id ON user_preferences (preference_id);
