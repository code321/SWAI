-- Migration: Create generation_runs table
-- Purpose: Track AI generation attempts with metadata and costs
-- Affected: New table 'generation_runs'
-- Dependencies: Requires sets table

-- Create generation_runs table to track AI sentence generation
create table generation_runs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  
  -- Owner and target set
  user_id uuid not null references profiles(user_id) on delete cascade,
  set_id uuid not null references sets(id) on delete cascade,
  
  -- Timestamp of generation
  occurred_at timestamptz not null default now(),
  
  -- Idempotency key to prevent duplicate generations
  idempotency_key text not null,
  
  -- AI model configuration
  model_id text not null,
  temperature numeric(3,2) not null default 1.00,
  prompt_version text not null,
  
  -- Token usage and cost tracking
  tokens_in int not null,
  tokens_out int not null,
  cost_usd numeric(10,4),
  
  -- Snapshot of words used in generation (for audit trail)
  words_snapshot jsonb not null,
  
  -- Unique constraint: prevent duplicate generations per user
  unique(user_id, idempotency_key)
);

comment on table generation_runs is 'AI sentence generation attempts with metadata and cost tracking';
comment on column generation_runs.user_id is 'Owner who triggered the generation';
comment on column generation_runs.set_id is 'Vocabulary set used for generation';
comment on column generation_runs.occurred_at is 'When the generation was executed';
comment on column generation_runs.idempotency_key is 'Unique key to prevent duplicate generation requests';
comment on column generation_runs.model_id is 'AI model identifier (e.g., gpt-4, claude-3)';
comment on column generation_runs.temperature is 'Model temperature parameter (0.00-2.00)';
comment on column generation_runs.prompt_version is 'Version identifier for the prompt template used';
comment on column generation_runs.tokens_in is 'Number of input tokens consumed';
comment on column generation_runs.tokens_out is 'Number of output tokens generated';
comment on column generation_runs.cost_usd is 'Estimated cost in USD for this generation';
comment on column generation_runs.words_snapshot is 'JSON snapshot of words used (for audit and debugging)';

-- Enable Row Level Security
alter table generation_runs enable row level security;

-- RLS Policy: Users can select their own generation runs (authenticated role)
create policy "Users can select own generation_runs (authenticated)"
  on generation_runs
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own generation runs (authenticated role)
create policy "Users can insert own generation_runs (authenticated)"
  on generation_runs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own generation runs (authenticated role)
create policy "Users can update own generation_runs (authenticated)"
  on generation_runs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own generation runs (authenticated role)
create policy "Users can delete own generation_runs (authenticated)"
  on generation_runs
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table generation_runs alter column user_id set default auth.uid();

