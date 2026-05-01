-- =============================================================================
-- Migration 005: rename claude_model → llm_model, add llm_provider,
--                rename search_query → retrieval_query on message evidence
-- =============================================================================

-- msgvault_profile_runs: provider-neutral LLM columns
ALTER TABLE msgvault_profile_runs
    RENAME COLUMN claude_model TO llm_model;

ALTER TABLE msgvault_profile_runs
    ADD COLUMN llm_provider text;

-- msgvault_message_evidence: clarify the column is the retrieval query
ALTER TABLE msgvault_message_evidence
    RENAME COLUMN search_query TO query_that_found_email;
