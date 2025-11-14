-- Migration: Create sentences table
-- Purpose: Store AI-generated exercise sentences
-- Affected: New table 'sentences'
-- Dependencies: Requires generation_runs, words tables, and helper functions

-- Create sentences table to store generated exercise content
create table sentences (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner, generation run, and target word
  user_id uuid not null references profiles(user_id) on delete cascade,
  generation_id uuid not null references generation_runs(id) on delete cascade,
  word_id uuid not null references words(id),
  
  -- Sentence content
  pl_text text not null,  -- Polish sentence (user sees this)
  target_en text not null,  -- Expected English translation
  
  -- Normalized English for answer comparison
  target_en_norm text generated always as (normalize_en(target_en)) stored,
  
  -- Word count with constraint (max 15 words)
  pl_word_count smallint generated always as (count_words(pl_text)) stored check (pl_word_count <= 15)
);

comment on table sentences is 'AI-generated exercise sentences with Polish text and English target answers';
comment on column sentences.user_id is 'Owner of this sentence (for RLS)';
comment on column sentences.generation_id is 'AI generation run that created this sentence';
comment on column sentences.word_id is 'Target vocabulary word this sentence practices';
comment on column sentences.pl_text is 'Polish sentence shown to user (max 15 words)';
comment on column sentences.target_en is 'Expected English translation';
comment on column sentences.target_en_norm is 'Normalized target for case-insensitive answer comparison';
comment on column sentences.pl_word_count is 'Word count of Polish text (enforced max: 15 words)';

-- Enable Row Level Security
alter table sentences enable row level security;

-- RLS Policy: Users can select their own sentences (authenticated role)
create policy "Users can select own sentences (authenticated)"
  on sentences
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own sentences (authenticated role)
create policy "Users can insert own sentences (authenticated)"
  on sentences
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own sentences (authenticated role)
create policy "Users can update own sentences (authenticated)"
  on sentences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own sentences (authenticated role)
create policy "Users can delete own sentences (authenticated)"
  on sentences
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table sentences alter column user_id set default auth.uid();

