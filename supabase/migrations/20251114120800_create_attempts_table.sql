-- Migration: Create attempts table
-- Purpose: Track user answers and correctness for each exercise
-- Affected: New table 'attempts'
-- Dependencies: Requires exercise_sessions and sentences tables, normalize_en function

-- Create attempts table to track individual answer attempts
create table attempts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Parent session and target sentence
  session_id uuid not null references exercise_sessions(id) on delete cascade,
  sentence_id uuid not null references sentences(id),
  
  -- Attempt tracking
  attempt_no smallint not null check (attempt_no >= 1),
  
  -- User's answer
  answer_raw text not null,
  
  -- Normalized answer for comparison
  answer_norm text generated always as (normalize_en(answer_raw)) stored,
  
  -- Correctness evaluation
  is_correct boolean not null,
  
  -- Timestamp
  checked_at timestamptz not null default now(),
  
  -- Unique constraint: prevent duplicate attempt numbers per sentence
  unique(session_id, sentence_id, attempt_no)
);

comment on table attempts is 'Individual user answers during exercise sessions with correctness tracking';
comment on column attempts.session_id is 'Exercise session this attempt belongs to';
comment on column attempts.sentence_id is 'Sentence being answered';
comment on column attempts.attempt_no is 'Attempt number for this sentence (1, 2, 3, etc.)';
comment on column attempts.answer_raw is 'User raw answer as entered';
comment on column attempts.answer_norm is 'Normalized answer for comparison with target_en_norm';
comment on column attempts.is_correct is 'Whether the answer matched the expected translation';
comment on column attempts.checked_at is 'When the answer was evaluated';

-- Enable Row Level Security
-- Note: attempts don't have user_id, so we check through session_id
alter table attempts enable row level security;

-- RLS Policy: Users can select attempts for their own sessions (authenticated role)
create policy "Users can select own attempts (authenticated)"
  on attempts
  for select
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = attempts.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert attempts for their own sessions (authenticated role)
create policy "Users can insert own attempts (authenticated)"
  on attempts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = attempts.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update attempts for their own sessions (authenticated role)
create policy "Users can update own attempts (authenticated)"
  on attempts
  for update
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = attempts.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = attempts.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete attempts for their own sessions (authenticated role)
create policy "Users can delete own attempts (authenticated)"
  on attempts
  for delete
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = attempts.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

