-- Migration: Create sets table
-- Purpose: Store vocabulary word sets for each user
-- Affected: New table 'sets'
-- Dependencies: Requires profiles table and cefr_level type

-- Create sets table to store vocabulary collections
create table sets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner of the set
  user_id uuid not null references profiles(user_id) on delete cascade,
  
  -- Set name (must be unique per user)
  name text not null,
  
  -- CEFR difficulty level
  level cefr_level not null,
  
  -- Count of words in this set (max 5, updated by trigger)
  words_count smallint not null default 0 check (words_count <= 5),
  
  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Unique constraint: user cannot have duplicate set names
  unique(user_id, name)
);

comment on table sets is 'Vocabulary word sets organized by user and CEFR level';
comment on column sets.user_id is 'Owner of this vocabulary set';
comment on column sets.name is 'User-defined name for the set (unique per user)';
comment on column sets.level is 'CEFR difficulty level for exercises';
comment on column sets.words_count is 'Number of words in set (max 5, enforced by business logic)';
comment on column sets.created_at is 'Timestamp when the set was created';
comment on column sets.updated_at is 'Timestamp when the set was last modified';

-- Enable Row Level Security
alter table sets enable row level security;

-- RLS Policy: Users can select their own sets (authenticated role)
create policy "Users can select own sets (authenticated)"
  on sets
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own sets (authenticated role)
create policy "Users can insert own sets (authenticated)"
  on sets
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own sets (authenticated role)
create policy "Users can update own sets (authenticated)"
  on sets
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own sets (authenticated role)
create policy "Users can delete own sets (authenticated)"
  on sets
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table sets alter column user_id set default auth.uid();

