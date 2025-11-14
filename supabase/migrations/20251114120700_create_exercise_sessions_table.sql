-- Migration: Create exercise_sessions table
-- Purpose: Track individual exercise sessions
-- Affected: New table 'exercise_sessions'
-- Dependencies: Requires sets and generation_runs tables

-- Create exercise_sessions table to track practice sessions
create table exercise_sessions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner, set, and generation used
  user_id uuid not null references profiles(user_id) on delete cascade,
  set_id uuid not null references sets(id) on delete cascade,
  generation_id uuid not null references generation_runs(id) on delete cascade,
  
  -- Session timing
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table exercise_sessions is 'Individual practice sessions tracking user progress through exercises';
comment on column exercise_sessions.user_id is 'User performing the exercise';
comment on column exercise_sessions.set_id is 'Vocabulary set being practiced';
comment on column exercise_sessions.generation_id is 'AI generation run used for this session';
comment on column exercise_sessions.started_at is 'When the session began';
comment on column exercise_sessions.finished_at is 'When the session completed (null if ongoing)';

-- Enable Row Level Security
alter table exercise_sessions enable row level security;

-- RLS Policy: Users can select their own exercise sessions (authenticated role)
create policy "Users can select own exercise_sessions (authenticated)"
  on exercise_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own exercise sessions (authenticated role)
create policy "Users can insert own exercise_sessions (authenticated)"
  on exercise_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own exercise sessions (authenticated role)
create policy "Users can update own exercise_sessions (authenticated)"
  on exercise_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own exercise sessions (authenticated role)
create policy "Users can delete own exercise_sessions (authenticated)"
  on exercise_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table exercise_sessions alter column user_id set default auth.uid();

