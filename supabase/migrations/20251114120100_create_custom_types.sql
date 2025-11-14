-- Migration: Create custom ENUM types
-- Purpose: Define CEFR language proficiency levels
-- Affected: Custom types used in tables

-- Create CEFR level enum for language proficiency classification
-- A1-A2: Basic user
-- B1-B2: Independent user
-- C1-C2: Proficient user
create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

comment on type cefr_level is 'CEFR language proficiency levels from A1 (beginner) to C2 (mastery)';

