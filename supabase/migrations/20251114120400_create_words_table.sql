-- Migration: Create words table and trigger for words_count
-- Purpose: Store individual vocabulary words within sets
-- Affected: New table 'words' and trigger to maintain sets.words_count
-- Dependencies: Requires sets table and normalize_en function

-- Create words table to store vocabulary pairs
create table words (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner and parent set
  user_id uuid not null references profiles(user_id) on delete cascade,
  set_id uuid not null references sets(id) on delete cascade,
  
  -- Word translations
  pl text not null,  -- Polish word
  en text not null,  -- English word
  
  -- Normalized English for case-insensitive comparison
  en_norm text generated always as (normalize_en(en)) stored,
  
  -- Position within the set (1-20)
  position smallint not null check (position between 1 and 20),
  
  -- Audit timestamp
  created_at timestamptz not null default now(),
  
  -- Unique constraints: no duplicate words (normalized) per set, no duplicate positions
  unique(user_id, set_id, en_norm),
  unique(user_id, set_id, position)
);

comment on table words is 'Individual vocabulary words within sets (max 20 per set)';
comment on column words.user_id is 'Owner of this word (for RLS)';
comment on column words.set_id is 'Parent vocabulary set';
comment on column words.pl is 'Polish translation';
comment on column words.en is 'English word or phrase';
comment on column words.en_norm is 'Normalized English for case-insensitive duplicate detection';
comment on column words.position is 'Position in set (1-20), used for ordering';
comment on column words.created_at is 'Timestamp when the word was added';

-- Enable Row Level Security
alter table words enable row level security;

-- RLS Policy: Users can select their own words (authenticated role)
create policy "Users can select own words (authenticated)"
  on words
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own words (authenticated role)
create policy "Users can insert own words (authenticated)"
  on words
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own words (authenticated role)
create policy "Users can update own words (authenticated)"
  on words
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own words (authenticated role)
create policy "Users can delete own words (authenticated)"
  on words
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table words alter column user_id set default auth.uid();

-- Create function to update words_count in sets table
create or replace function update_words_count()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Update words_count for the affected set
  update sets
  set words_count = (
    select count(*)::smallint
    from words
    where set_id = coalesce(new.set_id, old.set_id)
  ),
  updated_at = now()
  where id = coalesce(new.set_id, old.set_id);
  
  return coalesce(new, old);
end;
$$;

comment on function update_words_count is 'Trigger function to maintain accurate words_count in sets table';

-- Create trigger to automatically update words_count after insert/update/delete
create trigger trigger_update_words_count
  after insert or update or delete on words
  for each row
  execute function update_words_count();

comment on trigger trigger_update_words_count on words is 'Maintains sets.words_count accuracy when words are added, modified, or removed';

