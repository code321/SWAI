# REST API Plan

## 1. Zasoby
- **Profile** (`profiles`): stores Supabase user metadata (timezone, created_at). RLS ensures each row belongs to its owner and cascades delete to dependents.
- **Vocabulary Set** (`sets`): per-user grouping of up to five words, with CEFR level, timestamps, `words_count` tracking, unique `(user_id, name)` and prefix indexes for searching.
- **Word** (`words`): bilingual entries tied to a set and position (1-20) with normalized English text for duplicate prevention and ordering indexes.
- **Generation Run** (`generation_runs` + `generation_log`): captures every AI generation request (model, temperature, tokens, prompt version, idempotency key, words snapshot) and separately logs events for auditing.
- **Sentence** (`sentences`): generated Polish sentences mapped to a word and generation, with normalized targets and `pl_word_count` guard (≤15 words).
- **Exercise Session** (`exercise_sessions`): represents a user’s practice session for a given set and generation; holds start/end timestamps and is the parent for attempts and ratings.
- **Attempt** (`attempts`): individual answer checks for a sentence within a session, including normalized answer, correctness flag, and uniqueness per `(session_id, sentence_id, attempt_no)`.
- **Rating** (`ratings`): one-to-one review per session storing 1–5 stars (assumption: optional comment stored alongside via new `comment text NULL` column or `event_log` fallback).
- **Dashboard & Usage Stats** (`event_log`, derived views): aggregates daily generation usage, onboarding funnel events, and latency metrics for the client dashboard.

## 2. Endpointy

All endpoints (except Supabase Auth) live under `/api/*`, require a valid Supabase session (JWT or `sb-access-token`) and respect per-user RLS. Use cursor-based pagination with `limit` (default 10, max 50) and `cursor` (opaque `created_at|id` tuple).

### 2.1 Authentication (Supabase Auth proxies)

#### POST `/auth/v1/signup`
**Description**: Registers a new user using Supabase Auth and auto-creates a `profiles` row via trigger.  
**Request JSON**:
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "data": {
    "timezone": "Europe/Warsaw"
  }
}
```
**Response JSON**:
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { "access_token": "jwt", "refresh_token": "token" }
}
```
**Success**: `201 Created` (`AUTH_SIGNUP_SUCCESS`).  
**Errors**: `400` invalid email/password, `409` duplicated email, `500` Supabase failure.

#### POST `/auth/v1/token?grant_type=password`
**Description**: Logs user in with email/password and returns session tokens.  
**Request JSON**: `{ "email": "...", "password": "..." }`  
**Response JSON**: same schema as signup.  
**Success**: `200 OK` (`AUTH_LOGIN_SUCCESS`).  
**Errors**: `400` malformed, `401` invalid credentials, `423` locked account, `500`.

#### POST `/auth/v1/recover`
**Description**: Initiates password reset flow (link valid 24h).  
**Request JSON**: `{ "email": "..." }`  
**Response JSON**: `{ "message": "RESET_EMAIL_SENT" }`  
**Success**: `200 OK`.  
**Errors**: `400` invalid email, `404` user missing, `500`.

#### POST `/auth/v1/logout`
**Description**: Revokes refresh token and clears server session.  
**Request JSON**: _none_  
**Response JSON**: `{ "message": "LOGGED_OUT" }`  
**Success**: `200 OK`.  
**Errors**: `401` missing token, `500`.

### 2.2 Sets

#### GET `/api/sets`
**Description**: Lists the caller’s sets with search, CEFR filtering, pagination, and creation sort (najnowsze first).  
**Query Parameters**: `search` (string, optional, prefix match using `idx_sets_name_prefix`), `level` (enum A1-C2, optional), `cursor`, `limit`, `sort` (`created_at_desc` default, `name_asc`).  
**Request JSON**: _none_  
**Response JSON**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Travel",
      "level": "B1",
      "words_count": 5,
      "created_at": "2025-11-14T10:00:00Z"
    }
  ],
  "pagination": { "next_cursor": "timestamp|uuid", "count": 10 }
}
```
**Success**: `200 OK` (`SETS_FETCHED`).  
**Errors**: `401`, `422` invalid filters, `500`.

#### POST `/api/sets`
**Description**: Creates a new set with up to five initial words. Enforces unique name per user and CEFR value.  
**Request JSON**:
```json
{
  "name": "Food Basics",
  "level": "A2",
  "timezone": "Europe/Warsaw",
  "words": [
    { "pl": "jabłko", "en": "apple" },
    { "pl": "chleb", "en": "bread" }
  ]
}
```
**Response JSON**:
```json
{
  "id": "uuid",
  "name": "Food Basics",
  "level": "A2",
  "words_count": 2,
  "created_at": "2025-11-14T10:00:00Z"
}
```
**Success**: `201 Created` (`SET_CREATED`).  
**Errors**: `400` missing fields, `401`, `409` duplicate name, `422` >5 words or invalid CEFR, `500`.

#### GET `/api/sets/{setId}`
**Description**: Returns a single set with embedded words (ordered by `position`).  
**Request JSON**: _none_  
**Response JSON**:
```json
{
  "id": "uuid",
  "name": "Food Basics",
  "level": "A2",
  "words_count": 2,
  "words": [
    { "id": "uuid", "pl": "jabłko", "en": "apple", "position": 1 }
  ],
  "latest_generation": { "id": "uuid", "occurred_at": "..." }
}
```
**Success**: `200 OK` (`SET_FETCHED`).  
**Errors**: `401`, `404` not found, `500`.

#### PATCH `/api/sets/{setId}`
**Description**: Updates set metadata and optionally replaces word collection (still enforcing max five words despite PRD edit note).  
**Request JSON**:
```json
{
  "name": "Food Advanced",
  "level": "B1",
  "words": [
    { "id": "uuid", "pl": "jabłko", "en": "apple" },
    { "pl": "warzywo", "en": "vegetable" }
  ]
}
```
**Response JSON**: same as GET single set.  
**Success**: `200 OK` (`SET_UPDATED`).  
**Errors**: `400` invalid payload, `401`, `404`, `409` duplicate name, `422` validations (max words, CEFR invalid, duplicate English), `500`.

#### DELETE `/api/sets/{setId}`
**Description**: Permanently deletes a set and cascades to words, generations, sessions.  
**Request JSON**: _none_  
**Response JSON**: `{ "message": "SET_DELETED" }`  
**Success**: `204 No Content`.  
**Errors**: `401`, `404`, `409` active session prevents deletion (business guard), `500`.

### 2.3 Words (nested under a set)

#### POST `/api/sets/{setId}/words`
**Description**: Adds one or multiple words to a set, auto-assigning `position` sequentially.  
**Request JSON**:
```json
{
  "words": [
    { "pl": "samolot", "en": "plane" },
    { "pl": "lotnisko", "en": "airport", "position": 3 }
  ]
}
```
**Response JSON**:
```json
{
  "added": [
    { "id": "uuid", "pl": "samolot", "en": "plane", "position": 2 }
  ],
  "words_count": 4
}
```
**Success**: `201 Created` (`WORDS_ADDED`).  
**Errors**: `401`, `404` set missing, `409` duplicate normalized English or position, `422` exceeding five-word limit, invalid position range, `500`.

#### PATCH `/api/sets/{setId}/words/{wordId}`
**Description**: Updates translations or `position`.  
**Request JSON**: `{ "pl": "samolot pasażerski", "en": "airplane", "position": 1 }`  
**Response JSON**: updated word object.  
**Success**: `200 OK` (`WORD_UPDATED`).  
**Errors**: `401`, `404`, `409` duplicate english/position, `422` invalid position, `500`.

#### DELETE `/api/sets/{setId}/words/{wordId}`
**Description**: Removes a word and compacts positions + `words_count`.  
**Response JSON**: `{ "message": "WORD_DELETED", "words_count": 3 }`  
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `409` cannot delete during active generation, `500`.

#### PATCH `/api/sets/{setId}/words/reorder`
**Description**: Bulk reorder positions to maintain spacing before new generation.  
**Request JSON**:
```json
{
  "order": [
    { "word_id": "uuid-1", "position": 1 },
    { "word_id": "uuid-2", "position": 2 }
  ]
}
```
**Response JSON**: `{ "message": "WORDS_REORDERED" }`  
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `422` invalid payload, `500`.

### 2.4 Generation Runs & Sentences

#### POST `/api/sets/{setId}/generate`
**Description**: Triggers sentence generation for each word via OpenRouter, enforces daily limit (≤10), idempotency, and logs cost metrics.  
**Headers**: `X-Idempotency-Key` (required, unique per user per day), `X-Request-Id` (optional).  
**Request JSON**:
```json
{
  "model_id": "openai/gpt-4o-mini",
  "temperature": 0.8,
  "prompt_version": "v1.0.3"
}
```
**Response JSON**:
```json
{
  "generation_id": "uuid",
  "set_id": "uuid",
  "occurred_at": "2025-11-14T10:10:00Z",
  "sentences": [
    {
      "sentence_id": "uuid",
      "word_id": "uuid-word",
      "pl_text": "Na lotnisku było tłoczno.",
      "target_en": "..."
    }
  ],
  "usage": {
    "tokens_in": 1200,
    "tokens_out": 900,
    "cost_usd": 0.12,
    "remaining_generations_today": 4
  }
}
```
**Success**: `202 Accepted` (`GENERATION_STARTED`) if async, or `200 OK` when synchronous completion.  
**Errors**: `401`, `403` limit reached, `409` duplicate idempotency key, `422` missing words, `429` rate limited, `502` LLM failure, `500`.

#### GET `/api/sets/{setId}/generations`
**Description**: Lists recent generation runs for auditing and reinstating sentences.  
**Query Parameters**: `cursor`, `limit` (default 5), `include_stats` (boolean).  
**Response JSON**:
```json
{
  "data": [
    {
      "id": "uuid",
      "occurred_at": "2025-11-14T10:10:00Z",
      "model_id": "openai/gpt-4o-mini",
      "tokens_in": 1200,
      "tokens_out": 900,
      "sentences_generated": 12
    }
  ]
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `404` set missing, `500`.

#### GET `/api/generation-runs/{generationId}`
**Description**: Fetches a generation with full configuration and stored words snapshot.  
**Response JSON**:
```json
{
  "id": "uuid",
  "set_id": "uuid",
  "occurred_at": "...",
  "model_id": "openai/gpt-4o-mini",
  "temperature": 0.8,
  "prompt_version": "v1.0.3",
  "words_snapshot": [
    { "pl": "samolot", "en": "plane" }
  ]
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `500`.

#### GET `/api/generation-runs/{generationId}/sentences`
**Description**: Returns generated sentences for review or re-use in exercises.  
**Query Parameters**: `word_id` optional to filter, `limit`, `cursor`.  
**Response JSON**:
```json
{
  "data": [
    {
      "id": "uuid",
      "word_id": "uuid-word",
      "pl_text": "Na lotnisku było tłoczno.",
      "target_en": "It was crowded at the airport."
    }
  ]
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `500`.

### 2.5 Exercise Sessions

#### POST `/api/sessions`
**Description**: Starts a new exercise session for a set using the latest (or specified) generation.  
**Request JSON**:
```json
{
  "set_id": "uuid",
  "generation_id": "uuid", 
  "mode": "translate" 
}
```
**Response JSON**:
```json
{
  "id": "uuid-session",
  "set_id": "uuid",
  "generation_id": "uuid",
  "started_at": "2025-11-14T10:20:00Z",
  "pending_sentences": 12
}
```
**Success**: `201 Created` (`SESSION_STARTED`).  
**Errors**: `400` missing fields, `401`, `404` set/generation missing or mismatched user, `409` unfinished session already running, `500`.

#### GET `/api/sessions/{sessionId}`
**Description**: Retrieves session state including unfinished sentences and attempt summaries.  
**Response JSON**:
```json
{
  "id": "uuid-session",
  "set_id": "uuid",
  "generation_id": "uuid",
  "started_at": "...",
  "finished_at": null,
  "progress": { "attempted": 3, "correct": 2, "remaining": 9 },
  "sentences": [
    {
      "sentence_id": "uuid-sentence",
      "pl_text": "...",
      "latest_attempt": { "attempt_no": 2, "is_correct": false }
    }
  ]
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `500`.

#### PATCH `/api/sessions/{sessionId}/finish`
**Description**: Marks session as complete, sets `finished_at`, triggers rating prompt event.  
**Request JSON**: `{ "completed_reason": "all_sentences_answered" }`  
**Response JSON**: `{ "message": "SESSION_FINISHED", "finished_at": "..." }`  
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `409` already finished, `500`.

### 2.6 Attempts

#### POST `/api/sessions/{sessionId}/attempts`
**Description**: Submits a translation attempt for a sentence; backend normalizes answer, checks correctness, stores explanation, and logs latency.  
**Request JSON**:
```json
{
  "sentence_id": "uuid-sentence",
  "answer_raw": "It was crowded at the airport.",
  "attempt_no": 1
}
```
**Response JSON**:
```json
{
  "attempt_id": "uuid-attempt",
  "is_correct": true,
  "feedback": {
    "highlight": [],
    "explanation": "Correct article usage."
  },
  "answer_norm": "it was crowded at the airport",
  "checked_at": "2025-11-14T10:25:00Z"
}
```
**Success**: `200 OK` (`ATTEMPT_RECORDED`).  
**Errors**: `400` missing fields, `401`, `403` sentence not in session, `404`, `409` duplicate attempt number, `422` invalid attempt_no (<1), `500`.

#### GET `/api/sessions/{sessionId}/attempts`
**Description**: Provides audit history for analytics.  
**Query Parameters**: `sentence_id` optional, `cursor`, `limit`.  
**Response JSON**:
```json
{ "data": [ { "attempt_no": 1, "is_correct": true, "answer_raw": "..." } ] }
```
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `500`.

### 2.7 Ratings

#### POST `/api/sessions/{sessionId}/rating`
**Description**: Creates or upserts a rating (1–5 stars) and optional textual feedback (stored either in `ratings.comment` column or `event_log`).  
**Request JSON**:
```json
{
  "stars": 4,
  "comment": "Sentences were on-level."
}
```
**Response JSON**:
```json
{
  "session_id": "uuid-session",
  "stars": 4,
  "comment": "Sentences were on-level.",
  "created_at": "2025-11-14T10:45:00Z"
}
```
**Success**: `201 Created` (`RATING_RECORDED`) or `200 OK` on update.  
**Errors**: `400` invalid stars, `401`, `404` session missing or not finished, `409` duplicate when not allowed, `500`.

#### GET `/api/sessions/{sessionId}/rating`
**Description**: Fetches stored rating for summary views.  
**Response JSON**: rating object or `null`.  
**Success**: `200 OK`.  
**Errors**: `401`, `404`, `500`.

### 2.8 Usage & Dashboard

#### GET `/api/usage/daily`
**Description**: Returns today's generation quota and usage stats (US-011).  
**Response JSON**:
```json
{
  "limit": 10,
  "used": 6,
  "remaining": 4,
  "next_reset_at": "2025-11-18T00:00:00Z"
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `500`.

#### GET `/api/dashboard`
**Description**: Aggregates summary cards: set totals, last session state, onboarding step completion, outstanding tasks.  
**Query Parameters**: `include_events` boolean to include latest event_log rows.  
**Response JSON**:
```json
{
  "sets_total": 3,
  "active_session": { "session_id": "uuid", "started_at": "..." },
  "remaining_generations": 4,
  "events": [
    { "event_type": "attempt_submitted", "occurred_at": "..." }
  ]
}
```
**Success**: `200 OK`.  
**Errors**: `401`, `500`.

#### POST `/api/event-log`
**Description**: Records client-side onboarding or UI events not captured elsewhere (e.g., "clicked_check").  
**Request JSON**:
```json
{
  "event_type": "clicked_check",
  "entity_id": "uuid-sentence",
  "metadata": { "latency_ms": 1800 }
}
```
**Response JSON**: `{ "id": "uuid", "occurred_at": "..." }`  
**Success**: `201 Created`.  
**Errors**: `400`, `401`, `429` throttled, `500`.

## 3. Uwierzytelnianie i autoryzacja
- **Primary mechanism**: Supabase Auth JWT (short-lived access + refresh). Astro middleware validates tokens on each API call and injects `req.user` (user_id, email, roles).
- **Row-Level Security**: All data tables enforce `user_id = auth.uid()` (or derived constraints) ensuring horizontal isolation. Service role key is never used from the client.
- **Idempotency & replay protection**: Generation endpoint requires `X-Idempotency-Key`; server stores latest key per user/day to prevent duplicate LLM charges.
- **Authorization checks**: For nested resources (`words`, `generations`, `sessions`), server verifies that `set.user_id` matches `req.user.id` even though RLS guards the final query, providing early 403 responses.
- **Rate limiting**: 
  - `POST /api/sets/{setId}/generate`: 10/day hard limit + burst limiter (e.g., 2 per minute) keyed by user_id.
  - Auth endpoints protected by Supabase; additional IP-based limiter on `/api/event-log`.
- **Transport security**: Enforce HTTPS, HSTS, and `SameSite=strict` cookies for session persistence when used.
- **Observability**: All endpoints emit `X-Request-Id` (generated if absent) and push timings + AI cost to `event_log` for metrics (supporting PRD KPIs).

## 4. Walidacja i logika biznesowa

### 4.1 Profile
- Validate timezone against IANA database; default from Supabase metadata if missing.
- Block profile mutation outside dedicated endpoint (future enhancement).

### 4.2 Sets & Words
- Enforce max five words per set (PRD + DB constraint); acknowledge that increasing this requires schema and UX updates.
- Validate CEFR level against enum `A1`–`C2`.
- `words.position` must stay within 1–20, unique per set; reorder endpoint runs within transaction to avoid gaps.
- `words.en` normalized via `normalize_en` to enforce uniqueness; API rejects duplicates before hitting DB constraint.
- Updating or deleting words while a generation is running returns `409`.

### 4.3 Generation Runs & Sentences
- Before generating, ensure at least one word exists and user has remaining quota (daily cap 10 from `generation_log`).
- Input temperature clamped to 0–1; `model_id` validated against allowlist (OpenRouter models configured in env).
- Sentences truncated to ≤15 Polish words using `count_words`; backend verifies and rejects LLM responses exceeding the limit, re-prompting if necessary.
- Store `words_snapshot` and AI prompt/response metadata for reproducibility and onboarding analytics.
- `idempotency_key` + `user_id` unique constraint handles retried network calls.

### 4.4 Exercise Sessions & Attempts
- Only one active session per set per user; new session creation auto-finishes previous or returns `409`.
- When session starts, backend materializes ordered sentences from chosen generation to avoid drift even if words change later.
- Attempt validator normalizes answer (lowercase, punctuation stripped), enforces proper articles, and highlights diff for client.
- `attempt_no` auto-increments when omitted; manual overrides validated against uniqueness constraint.
- `SESSION_FINISHED` requires all sentences attempted or explicit abandon reason; finishing triggers rating reminder event.

### 4.5 Ratings
- Stars integer 1–5; invalid input returns `422`.
- Comment length ≤500 chars; sanitized to prevent HTML injection.
- Ratings allowed only after `finished_at` is set; otherwise `409`.

### 4.6 Dashboard, Usage, Events
- `/api/usage/daily` depends on `generation_log` rows grouped by UTC date respecting timezone stored in `profiles`.
- `/api/event-log` validates `event_type` against whitelist (e.g., `set_created`, `attempt_submitted`, `clicked_check`) and caps payload rate to avoid noisy metrics.
- Dashboard endpoint preloads data via indexes (`idx_sets_user_created`, `idx_sessions_user_started`) to keep response <200 ms.

### 4.7 Error handling & responses
- Standardized error envelope: `{ "error": { "code": "LIMIT_REACHED", "message": "Daily generation quota exceeded." } }`.
- Use early guard clauses for invalid state (missing ownership, out-of-quota) and log structured errors for observability.

### 4.8 Assumptions & open questions
- Rating comments require either an added nullable `comment` column on `ratings` or auxiliary storage in `event_log`. Until schema change, default to event log entry referencing the rating row.
- PRD and DB are aligned on the five-word-per-set limit; any future increase demands schema updates (`words_count` cap, validation) and UI adjustments.
- AI sentence regeneration is synchronous for now; consider background job + webhook if latency exceeds 30s KPI.

