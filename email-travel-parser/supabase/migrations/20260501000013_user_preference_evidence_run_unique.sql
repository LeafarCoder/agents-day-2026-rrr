-- =============================================================================
-- Migration 013: add unique constraint on (user_preference_id, run_id)
-- so the orchestrator can upsert evidence rows without creating duplicates
-- on re-runs (evidence_id is always NULL, so the existing UNIQUE on that
-- column treats every row as distinct).
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preference_evidence_pref_run
    ON user_preference_evidence (user_preference_id, run_id)
    WHERE run_id IS NOT NULL;
