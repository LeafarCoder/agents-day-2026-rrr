-- =============================================================================
-- Migration 011: align vector dimensions with nomic-embed-text (768)
-- and allow minimax-based source label
-- =============================================================================

-- Drop the HNSW index (dimension-bound, must recreate after column change)
DROP INDEX IF EXISTS idx_user_taste_profiles_embedding;

-- Replace the vector column (drop+add is required to change pgvector dimension)
ALTER TABLE user_taste_profiles DROP COLUMN IF EXISTS embedding;
ALTER TABLE user_taste_profiles ADD COLUMN embedding vector(768);

-- Fix embedding_dimensions default and CHECK
ALTER TABLE user_taste_profiles
    ALTER COLUMN embedding_dimensions SET DEFAULT 768;

ALTER TABLE user_taste_profiles
    DROP CONSTRAINT IF EXISTS user_taste_profiles_embedding_dimensions_check;
UPDATE user_taste_profiles SET embedding_dimensions = 768;
ALTER TABLE user_taste_profiles
    ADD CONSTRAINT user_taste_profiles_embedding_dimensions_check
    CHECK (embedding_dimensions = 768);

-- Allow the new source label produced by the MiniMax pipeline
ALTER TABLE user_taste_profiles
    DROP CONSTRAINT IF EXISTS user_taste_profiles_source_check;
ALTER TABLE user_taste_profiles
    ADD CONSTRAINT user_taste_profiles_source_check
    CHECK (source IN ('msgvault_claude', 'msgvault_minimax', 'manual', 'imported'));

-- Fix embedding_dimensions default in profile runs table too
ALTER TABLE msgvault_profile_runs
    ALTER COLUMN embedding_dimensions SET DEFAULT 768;

-- Recreate HNSW index for 768-dim cosine search
CREATE INDEX idx_user_taste_profiles_embedding
    ON user_taste_profiles
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;
