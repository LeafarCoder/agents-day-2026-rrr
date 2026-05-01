-- =============================================================================
-- Migration 003: msgvault-backed taste profiles
-- =============================================================================
--
-- Pipeline:
--   1. msgvault keeps the Gmail archive and message vectors local.
--   2. Semantic/hybrid msgvault search returns relevant travel emails.
--   3. Claude extracts structured preferences from those emails.
--   4. The app writes normalized preferences plus an embedded taste profile here.

CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- msgvault account/source metadata
-- -----------------------------------------------------------------------------

CREATE TABLE msgvault_sources (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    account_email              text        NOT NULL,
    msgvault_source_id          integer,
    msgvault_home              text,
    last_sync_at               timestamptz,
    active_vector_generation   jsonb,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, account_email)
);

CREATE INDEX idx_msgvault_sources_user_id ON msgvault_sources (user_id);

COMMENT ON TABLE msgvault_sources IS
    'Maps an app user to a local msgvault account/source. Email bodies and msgvault vectors stay in the local msgvault SQLite/vectors.db store.';
COMMENT ON COLUMN msgvault_sources.active_vector_generation IS
    'Snapshot from msgvault stats/search metadata: generation id, model, dimension, fingerprint, and state.';

-- -----------------------------------------------------------------------------
-- Pipeline runs
-- -----------------------------------------------------------------------------

CREATE TABLE msgvault_profile_runs (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    msgvault_source_id       uuid        REFERENCES msgvault_sources (id) ON DELETE SET NULL,
    status                   text        NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    search_mode              text        NOT NULL CHECK (search_mode IN ('fts', 'vector', 'hybrid')),
    search_queries           jsonb       NOT NULL DEFAULT '[]'::jsonb,
    search_result_count      integer     NOT NULL DEFAULT 0 CHECK (search_result_count >= 0),
    claude_model             text,
    extraction_prompt_hash   text,
    embedding_model          text,
    embedding_dimensions     integer     NOT NULL DEFAULT 1536 CHECK (embedding_dimensions > 0),
    started_at               timestamptz NOT NULL DEFAULT now(),
    completed_at             timestamptz,
    error_message            text
);

CREATE INDEX idx_msgvault_profile_runs_user_id    ON msgvault_profile_runs (user_id);
CREATE INDEX idx_msgvault_profile_runs_started_at ON msgvault_profile_runs (started_at DESC);

COMMENT ON TABLE msgvault_profile_runs IS
    'One execution of msgvault semantic search plus Claude preference extraction.';

-- -----------------------------------------------------------------------------
-- Search evidence used by Claude
-- -----------------------------------------------------------------------------

CREATE TABLE msgvault_message_evidence (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id                   uuid        NOT NULL REFERENCES msgvault_profile_runs (id) ON DELETE CASCADE,
    user_id                  uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    email_id                 uuid        REFERENCES emails (id) ON DELETE SET NULL,
    msgvault_message_id      text        NOT NULL,
    msgvault_source_message_id text,
    sender_domain            text,
    subject                  text,
    sent_at                  timestamptz,
    snippet                  text,
    search_query             text,
    search_rank              integer     CHECK (search_rank IS NULL OR search_rank > 0),
    relevance_score          numeric,
    extracted_preferences    jsonb       NOT NULL DEFAULT '[]'::jsonb,
    created_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (run_id, msgvault_message_id)
);

CREATE INDEX idx_msgvault_message_evidence_run_id  ON msgvault_message_evidence (run_id);
CREATE INDEX idx_msgvault_message_evidence_user_id ON msgvault_message_evidence (user_id);
CREATE INDEX idx_msgvault_message_evidence_email_id ON msgvault_message_evidence (email_id);

COMMENT ON TABLE msgvault_message_evidence IS
    'Message-level provenance for preferences inferred from local msgvault search results.';
COMMENT ON COLUMN msgvault_message_evidence.extracted_preferences IS
    'Claude output for this evidence message before normalization into preferences/user_preferences.';

-- -----------------------------------------------------------------------------
-- Embedded taste profile
-- -----------------------------------------------------------------------------

CREATE TABLE user_taste_profiles (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    latest_run_id         uuid        REFERENCES msgvault_profile_runs (id) ON DELETE SET NULL,
    profile_text          text        NOT NULL,
    profile_json          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    embedding             vector(1536),
    embedding_model       text,
    embedding_dimensions  integer     NOT NULL DEFAULT 1536 CHECK (embedding_dimensions = 1536),
    source                text        NOT NULL DEFAULT 'msgvault_claude'
                                      CHECK (source IN ('msgvault_claude', 'manual', 'imported')),
    confidence            numeric(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    generated_at          timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

CREATE INDEX idx_user_taste_profiles_user_id ON user_taste_profiles (user_id);
CREATE INDEX idx_user_taste_profiles_embedding
    ON user_taste_profiles
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;

COMMENT ON TABLE user_taste_profiles IS
    'The planner-facing taste profile: compact Claude summary, structured JSON, and a pgvector embedding for semantic matching.';
COMMENT ON COLUMN user_taste_profiles.profile_json IS
    'Structured profile such as preferred activities, destinations, budget/lodging signals, avoidances, and evidence counts.';

-- -----------------------------------------------------------------------------
-- Link normalized user preferences back to msgvault/Claude evidence
-- -----------------------------------------------------------------------------

CREATE TABLE user_preference_evidence (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_preference_id  uuid NOT NULL REFERENCES user_preferences (id) ON DELETE CASCADE,
    evidence_id         uuid REFERENCES msgvault_message_evidence (id) ON DELETE SET NULL,
    run_id              uuid REFERENCES msgvault_profile_runs (id) ON DELETE SET NULL,
    confidence          numeric(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    rationale           text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_preference_id, evidence_id)
);

CREATE INDEX idx_user_preference_evidence_preference_id
    ON user_preference_evidence (user_preference_id);
CREATE INDEX idx_user_preference_evidence_run_id
    ON user_preference_evidence (run_id);
