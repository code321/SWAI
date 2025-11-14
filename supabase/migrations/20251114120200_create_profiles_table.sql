-- Migration: Create profiles table
-- Purpose: Store user profile information extending Supabase Auth
-- Affected: New table 'profiles'
-- Dependencies: Requires auth.users from Supabase Auth

-- Create profiles table to extend auth.users with application-specific data
create table profiles (
  -- Primary key references Supabase Auth user
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- User's preferred timezone for scheduling and notifications
  timezone text not null,
  
  -- Audit timestamp
  created_at timestamptz not null default now()
);

comment on table profiles is 'User profiles extending Supabase Auth with app-specific data';
comment on column profiles.user_id is 'References the Supabase Auth user ID';
comment on column profiles.timezone is 'User timezone for scheduling (IANA format, e.g., Europe/Warsaw)';
comment on column profiles.created_at is 'Timestamp when the profile was created';

-- Enable Row Level Security
alter table profiles enable row level security;

-- RLS Policy: Users can select their own profile (authenticated role)
create policy "Users can select own profile (authenticated)"
  on profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can insert their own profile (authenticated role)
create policy "Users can insert own profile (authenticated)"
  on profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own profile (authenticated role)
create policy "Users can update own profile (authenticated)"
  on profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own profile (authenticated role)
create policy "Users can delete own profile (authenticated)"
  on profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Set default value for user_id to current authenticated user
alter table profiles alter column user_id set default auth.uid();

