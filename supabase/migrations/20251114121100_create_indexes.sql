-- Migration: Create performance indexes
-- Purpose: Optimize common query patterns
-- Affected: Indexes on multiple tables
-- Dependencies: Requires all tables to be created

-- Index for prefix searching on set names
-- Used for autocomplete and search functionality
create index idx_sets_name_prefix on sets using btree (name text_pattern_ops);

comment on index idx_sets_name_prefix is 'Supports prefix search on set names (e.g., LIKE ''prefix%'')';

-- Index for retrieving user sets ordered by creation date
-- Used for "my recent sets" views
create index idx_sets_user_created on sets (user_id, created_at desc);

comment on index idx_sets_user_created is 'Optimizes queries fetching user sets ordered by newest first';

-- Index for filtering sets by user and level
-- Used for "show my A1 sets" type queries
create index idx_sets_user_level on sets (user_id, level);

comment on index idx_sets_user_level is 'Optimizes queries filtering sets by CEFR level for a user';


-- Index for retrieving recent generation runs
-- Used for "my generation history" views
create index idx_gen_runs_recent on generation_runs (user_id, set_id, occurred_at desc);

comment on index idx_gen_runs_recent is 'Optimizes queries fetching recent generation runs for a user/set';

-- Index for retrieving sentences by generation
-- Used when loading exercises from a generation run
create index idx_sentences_gen on sentences (user_id, generation_id);

comment on index idx_sentences_gen is 'Optimizes queries fetching sentences from a specific generation';

-- Index for retrieving user exercise sessions
-- Used for "my practice history" views
create index idx_sessions_user_started on exercise_sessions (user_id, started_at desc);

comment on index idx_sessions_user_started is 'Optimizes queries fetching user sessions ordered by most recent';

-- Index for retrieving attempts within a session
-- Used for showing answers during/after an exercise
create index idx_attempts_session_checked on attempts (session_id, checked_at desc);

comment on index idx_attempts_session_checked is 'Optimizes queries fetching attempts for a session in chronological order';

-- Index for retrieving user ratings
-- Note: ratings doesn't have user_id, but this would need a join through sessions
-- This index is for when ratings table gets enhanced with user_id denormalized
-- For now, commented out as ratings is accessed via session_id (PK)
-- create index idx_ratings_user on ratings (user_id, created_at desc);

-- Index for generation rate limiting checks
-- Used to count generations in the last 24 hours
create index idx_generation_log_user_occurred on generation_log (user_id, occurred_at desc);

comment on index idx_generation_log_user_occurred is 'Optimizes rate limiting checks (e.g., generations in last 24 hours)';

-- Index for event log queries
-- Used for audit trail and analytics
create index idx_event_log_user_occurred on event_log (user_id, occurred_at desc);

comment on index idx_event_log_user_occurred is 'Optimizes queries fetching user event history';

-- Index for event log by type
-- Used for filtering specific event types
create index idx_event_log_type on event_log (event_type, occurred_at desc);

comment on index idx_event_log_type is 'Optimizes queries filtering events by type';

