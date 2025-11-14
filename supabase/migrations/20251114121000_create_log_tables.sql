-- Migration: Create logging tables for audit and rate limiting
-- Purpose: Track generation events and general application events
-- Affected: New tables 'generation_log' and 'event_log'
-- Dependencies: Requires profiles and sets tables

-- Create generation_log table for rate limiting (10 generations per day)
create table generation_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner and optional set reference
  user_id uuid not null references profiles(user_id) on delete cascade,
  set_id uuid references sets(id) on delete set null,
  
  -- Timestamp
  occurred_at timestamptz not null default now()
);

comment on table generation_log is 'Tracks generation events for rate limiting (10 per day per user)';
comment on column generation_log.user_id is 'User who triggered the generation';
comment on column generation_log.set_id is 'Set used for generation (nullable if set is deleted)';
comment on column generation_log.occurred_at is 'When the generation occurred';

-- Enable Row Level Security
alter table generation_log enable row level security;

-- RLS Policy: Users can select their own generation logs (authenticated role)
create policy "Users can select own generation_log (authenticated)"
  on generation_log
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own generation logs (authenticated role)
create policy "Users can insert own generation_log (authenticated)"
  on generation_log
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own generation logs (authenticated role)
create policy "Users can update own generation_log (authenticated)"
  on generation_log
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own generation logs (authenticated role)
create policy "Users can delete own generation_log (authenticated)"
  on generation_log
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table generation_log alter column user_id set default auth.uid();

-- Create event_log table for general application events
create table event_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner
  user_id uuid not null references profiles(user_id) on delete cascade,
  
  -- Event details
  event_type text not null,
  entity_id uuid not null,
  
  -- Timestamp
  occurred_at timestamptz not null default now()
);

comment on table event_log is 'General application event log for audit trail';
comment on column event_log.user_id is 'User who triggered the event';
comment on column event_log.event_type is 'Type of event (e.g., set_created, word_deleted, session_completed)';
comment on column event_log.entity_id is 'ID of the entity affected by the event';
comment on column event_log.occurred_at is 'When the event occurred';

-- Enable Row Level Security
alter table event_log enable row level security;

-- RLS Policy: Users can select their own event logs (authenticated role)
create policy "Users can select own event_log (authenticated)"
  on event_log
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own event logs (authenticated role)
create policy "Users can insert own event_log (authenticated)"
  on event_log
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own event logs (authenticated role)
create policy "Users can update own event_log (authenticated)"
  on event_log
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own event logs (authenticated role)
create policy "Users can delete own event_log (authenticated)"
  on event_log
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table event_log alter column user_id set default auth.uid();

