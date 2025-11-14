-- Migration: Disable all RLS policies
-- Purpose: Disable all Row Level Security policies defined in previous migrations
-- Affected: All tables with RLS policies
-- Dependencies: All previous table creation migrations

-- ============================================================
-- PROFILES TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own profile (authenticated)" on profiles;
drop policy if exists "Users can insert own profile (authenticated)" on profiles;
drop policy if exists "Users can update own profile (authenticated)" on profiles;
drop policy if exists "Users can delete own profile (authenticated)" on profiles;

-- ============================================================
-- SETS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own sets (authenticated)" on sets;
drop policy if exists "Users can insert own sets (authenticated)" on sets;
drop policy if exists "Users can update own sets (authenticated)" on sets;
drop policy if exists "Users can delete own sets (authenticated)" on sets;

-- ============================================================
-- WORDS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own words (authenticated)" on words;
drop policy if exists "Users can insert own words (authenticated)" on words;
drop policy if exists "Users can update own words (authenticated)" on words;
drop policy if exists "Users can delete own words (authenticated)" on words;

-- ============================================================
-- GENERATION_RUNS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own generation_runs (authenticated)" on generation_runs;
drop policy if exists "Users can insert own generation_runs (authenticated)" on generation_runs;
drop policy if exists "Users can update own generation_runs (authenticated)" on generation_runs;
drop policy if exists "Users can delete own generation_runs (authenticated)" on generation_runs;

-- ============================================================
-- SENTENCES TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own sentences (authenticated)" on sentences;
drop policy if exists "Users can insert own sentences (authenticated)" on sentences;
drop policy if exists "Users can update own sentences (authenticated)" on sentences;
drop policy if exists "Users can delete own sentences (authenticated)" on sentences;

-- ============================================================
-- EXERCISE_SESSIONS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own exercise_sessions (authenticated)" on exercise_sessions;
drop policy if exists "Users can insert own exercise_sessions (authenticated)" on exercise_sessions;
drop policy if exists "Users can update own exercise_sessions (authenticated)" on exercise_sessions;
drop policy if exists "Users can delete own exercise_sessions (authenticated)" on exercise_sessions;

-- ============================================================
-- ATTEMPTS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own attempts (authenticated)" on attempts;
drop policy if exists "Users can insert own attempts (authenticated)" on attempts;
drop policy if exists "Users can update own attempts (authenticated)" on attempts;
drop policy if exists "Users can delete own attempts (authenticated)" on attempts;

-- ============================================================
-- RATINGS TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own ratings (authenticated)" on ratings;
drop policy if exists "Users can insert own ratings (authenticated)" on ratings;
drop policy if exists "Users can update own ratings (authenticated)" on ratings;
drop policy if exists "Users can delete own ratings (authenticated)" on ratings;

-- ============================================================
-- GENERATION_LOG TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own generation_log (authenticated)" on generation_log;
drop policy if exists "Users can insert own generation_log (authenticated)" on generation_log;
drop policy if exists "Users can update own generation_log (authenticated)" on generation_log;
drop policy if exists "Users can delete own generation_log (authenticated)" on generation_log;

-- ============================================================
-- EVENT_LOG TABLE POLICIES
-- ============================================================

drop policy if exists "Users can select own event_log (authenticated)" on event_log;
drop policy if exists "Users can insert own event_log (authenticated)" on event_log;
drop policy if exists "Users can update own event_log (authenticated)" on event_log;
drop policy if exists "Users can delete own event_log (authenticated)" on event_log;

