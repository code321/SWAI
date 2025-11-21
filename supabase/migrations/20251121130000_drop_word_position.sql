-- Migration: Drop position column from words table and related constraints

BEGIN;

-- 1. Drop unique constraint on (user_id, set_id, position)
ALTER TABLE public.words
  DROP CONSTRAINT IF EXISTS words_user_id_set_id_position_key;

-- 2. Drop position column
ALTER TABLE public.words
  DROP COLUMN IF EXISTS position;

COMMIT;
