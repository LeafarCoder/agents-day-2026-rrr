-- Store raw LLM extraction result per email so re-scans skip already-processed messages.
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS llm_extraction JSONB;
