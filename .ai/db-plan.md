# Schemat bazy danych – SmartWordsAI (PostgreSQL)

## 1. Tabele

| Tabela | Kolumna | Typ | Ograniczenia |
| ------ | ------- | --- | ------------ |
| **profiles** | user_id | uuid | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE, DEFAULT auth.uid() |
| | timezone | text | NOT NULL |
| | created_at | timestamptz | NOT NULL DEFAULT now() |

| **sets** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | name | text | NOT NULL |
| | level | cefr_level | NOT NULL |
| | words_count | smallint | NOT NULL DEFAULT 0, CHECK (words_count <= 5) |
| | created_at | timestamptz | NOT NULL DEFAULT now() |
| | updated_at | timestamptz | NOT NULL DEFAULT now() |
| | UNIQUE(user_id, name) | | |

| **words** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | set_id | uuid | NOT NULL REFERENCES sets(id) ON DELETE CASCADE |
| | pl | text | NOT NULL |
| | en | text | NOT NULL |
| | en_norm | text | GENERATED ALWAYS AS (normalize_en(en)) STORED |
| | position | smallint | NOT NULL CHECK (position BETWEEN 1 AND 20) |
| | created_at | timestamptz | NOT NULL DEFAULT now() |
| | UNIQUE(user_id, set_id, en_norm) | | |
| | UNIQUE(user_id, set_id, position) | | |

| **generation_runs** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | set_id | uuid | NOT NULL REFERENCES sets(id) ON DELETE CASCADE |
| | occurred_at | timestamptz | NOT NULL DEFAULT now() |
| | idempotency_key | text | NOT NULL |
| | model_id | text | NOT NULL |
| | temperature | numeric(3,2) | NOT NULL DEFAULT 1.00 |
| | prompt_version | text | NOT NULL |
| | tokens_in | int | NOT NULL |
| | tokens_out | int | NOT NULL |
| | cost_usd | numeric(10,4) | |
| | words_snapshot | jsonb | NOT NULL |
| | UNIQUE(user_id, idempotency_key) | | |

| **sentences** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | generation_id | uuid | NOT NULL REFERENCES generation_runs(id) ON DELETE CASCADE |
| | word_id | uuid | NOT NULL REFERENCES words(id) |
| | pl_text | text | NOT NULL |
| | target_en | text | NOT NULL |
| | target_en_norm | text | GENERATED ALWAYS AS (normalize_en(target_en)) STORED |
| | pl_word_count | smallint | GENERATED ALWAYS AS (count_words(pl_text)) STORED CHECK (pl_word_count <= 15) |

| **exercise_sessions** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | set_id | uuid | NOT NULL REFERENCES sets(id) ON DELETE CASCADE |
| | generation_id | uuid | NOT NULL REFERENCES generation_runs(id) ON DELETE CASCADE |
| | started_at | timestamptz | NOT NULL DEFAULT now() |
| | finished_at | timestamptz | |

| **attempts** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | session_id | uuid | NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE |
| | sentence_id | uuid | NOT NULL REFERENCES sentences(id) |
| | attempt_no | smallint | NOT NULL CHECK (attempt_no >= 1) |
| | answer_raw | text | NOT NULL |
| | answer_norm | text | GENERATED ALWAYS AS (normalize_en(answer_raw)) STORED |
| | is_correct | boolean | NOT NULL |
| | checked_at | timestamptz | NOT NULL DEFAULT now() |
| | UNIQUE(session_id, sentence_id, attempt_no) | | |

| **ratings** | session_id | uuid | PRIMARY KEY REFERENCES exercise_sessions(id) ON DELETE CASCADE |
| | stars | smallint | NOT NULL CHECK (stars BETWEEN 1 AND 5) |
| | created_at | timestamptz | NOT NULL DEFAULT now() |

| **generation_log** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | set_id | uuid | REFERENCES sets(id) ON DELETE SET NULL |
| | occurred_at | timestamptz | NOT NULL DEFAULT now() |

| **event_log** | id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() |
| | user_id | uuid | NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE |
| | event_type | text | NOT NULL |
| | entity_id | uuid | NOT NULL |
| | occurred_at | timestamptz | NOT NULL DEFAULT now() |

### Typy własne

```sql
CREATE TYPE cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2');
```

## 2. Relacje

- profiles 1-n sets
- sets 1-n words
- sets 1-n generation_runs
- generation_runs 1-n sentences
- generation_runs 1-n exercise_sessions
- exercise_sessions 1-n attempts
- exercise_sessions 1-1 ratings
- words 1-n sentences (poprzez word_id)

## 3. Indeksy

```sql
-- Prefiksowe wyszukiwanie nazw zestawów
CREATE INDEX idx_sets_name_prefix ON sets USING btree (name text_pattern_ops);

-- Często używane filtry
CREATE INDEX idx_sets_user_created ON sets (user_id, created_at DESC);
CREATE INDEX idx_sets_user_level ON sets (user_id, level);
CREATE INDEX idx_words_position ON words (user_id, set_id, position);
CREATE INDEX idx_gen_runs_recent ON generation_runs (user_id, set_id, occurred_at DESC);
CREATE INDEX idx_sentences_gen ON sentences (user_id, generation_id);
CREATE INDEX idx_sessions_user_started ON exercise_sessions (user_id, started_at DESC);
CREATE INDEX idx_attempts_session_checked ON attempts (session_id, checked_at DESC);
CREATE INDEX idx_ratings_user ON ratings (user_id, created_at DESC);
```

## 4. Polityki RLS (skrót)

```sql
ALTER TABLE <table>
  ENABLE ROW LEVEL SECURITY;

-- Każda tabela: dostęp tylko do własnych wierszy
CREATE POLICY "Own rows" ON <table>
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Domyślna wartość user_id
ALTER TABLE <table>
  ALTER COLUMN user_id SET DEFAULT auth.uid();
```

Zastosować dla: `sets`, `words`, `generation_runs`, `sentences`, `exercise_sessions`, `attempts`, `ratings`, `generation_log`, `event_log`.

## 5. Dodatkowe uwagi

1. Limity biznesowe egzekwowane w bazie:
   - 5 słówek na zestaw (`words_count` + trigger aktualizujący licznik).
   - 15 słów na zdanie (`pl_word_count`).
   - 10 generacji dziennie na użytkownika (transakcyjna funkcja sprawdzająca `generation_log`).
2. Funkcje `normalize_en(text)` i `count_words(text)` implementują logikę normalizacji i zliczania słów.
3. `idempotency_key` chroni przed duplikacją generacji w razie ponownych żądań.
4. Twarde usuwanie (`ON DELETE CASCADE`) bez soft-delete; zdarzenia audytowe przechowywane w `event_log`.
5. Partycjonowanie nie jest wymagane w MVP; rozważyć w przyszłości dla `event_log` i `attempts`.
6. Tabela `auth.users` (dostarczana przez Supabase Auth) przechowuje e-maile i hashe haseł; nasze tabele odnoszą się do niej przez `user_id` i nie powielają tych danych.
