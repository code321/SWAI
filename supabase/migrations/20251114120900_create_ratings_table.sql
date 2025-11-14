-- Migration: Create ratings table
-- Purpose: Store user satisfaction ratings for exercise sessions
-- Affected: New table 'ratings'
-- Dependencies: Requires exercise_sessions table

-- Create ratings table to track session satisfaction (1-5 stars)
create table ratings (
  -- Primary key references session (one rating per session)
  session_id uuid primary key references exercise_sessions(id) on delete cascade,
  
  -- Star rating (1-5)
  stars smallint not null check (stars between 1 and 5),
  
  -- Timestamp
  created_at timestamptz not null default now()
);

comment on table ratings is 'User satisfaction ratings for completed exercise sessions (1-5 stars)';
comment on column ratings.session_id is 'Exercise session being rated (one-to-one relationship)';
comment on column ratings.stars is 'User rating from 1 (poor) to 5 (excellent)';
comment on column ratings.created_at is 'When the rating was submitted';

-- Enable Row Level Security
-- Note: ratings don't have user_id, so we check through session_id
alter table ratings enable row level security;

-- RLS Policy: Users can select ratings for their own sessions (authenticated role)
create policy "Users can select own ratings (authenticated)"
  on ratings
  for select
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = ratings.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert ratings for their own sessions (authenticated role)
create policy "Users can insert own ratings (authenticated)"
  on ratings
  for insert
  to authenticated
  with check (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = ratings.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update ratings for their own sessions (authenticated role)
create policy "Users can update own ratings (authenticated)"
  on ratings
  for update
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = ratings.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = ratings.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete ratings for their own sessions (authenticated role)
create policy "Users can delete own ratings (authenticated)"
  on ratings
  for delete
  to authenticated
  using (
    exists (
      select 1 from exercise_sessions
      where exercise_sessions.id = ratings.session_id
      and exercise_sessions.user_id = auth.uid()
    )
  );

