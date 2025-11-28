-- Migration: Add index for finding active exercise sessions
-- Purpose: Optimize queries checking for active sessions (finished_at IS NULL)
-- Affected: exercise_sessions table
-- Dependencies: Requires exercise_sessions table

-- Create index for finding active sessions per user
-- This optimizes the check "does user have an active session for this set?"
-- Used in startSession to prevent concurrent active sessions
create index idx_exercise_sessions_user_active 
  on exercise_sessions (user_id, set_id, finished_at);

comment on index idx_exercise_sessions_user_active is 
  'Optimizes queries checking for active sessions (finished_at IS NULL) per user and set';

