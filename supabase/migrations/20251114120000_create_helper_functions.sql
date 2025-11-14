-- Migration: Create helper functions for text normalization and word counting
-- Purpose: Provide reusable functions for normalizing English text and counting words
-- Affected: Helper functions used across multiple tables

-- Function to normalize English text for comparison
-- Converts to lowercase, trims whitespace, and removes punctuation
create or replace function normalize_en(text_input text)
returns text
language plpgsql
immutable
as $$
begin
  return lower(trim(regexp_replace(text_input, '[[:punct:]]', '', 'g')));
end;
$$;

comment on function normalize_en is 'Normalizes English text by converting to lowercase, trimming whitespace, and removing punctuation';

-- Function to count words in text
-- Splits text by whitespace and counts non-empty elements
create or replace function count_words(text_input text)
returns smallint
language plpgsql
immutable
as $$
begin
  return (
    select count(*)::smallint
    from regexp_split_to_table(trim(text_input), '\s+') as word
    where word != ''
  );
end;
$$;

comment on function count_words is 'Counts the number of words in a text string by splitting on whitespace';

