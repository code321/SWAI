# Plan Testów - SmartWordsAI

## 1. Wprowadzenie

### 1.1. Cel dokumentu
Niniejszy dokument definiuje kompleksową strategię testowania aplikacji SmartWordsAI - platformy do nauki słownictwa angielskiego z wykorzystaniem sztucznej inteligencji do generowania kontekstowych zdań w języku polskim.

### 1.2. Zakres dokumentu
Plan testów obejmuje wszystkie komponenty systemu na etapie MVP, definiuje typy testów, scenariusze testowe, narzędzia oraz procedury raportowania błędów.

### 1.3. Cele testowania
- Weryfikacja poprawności działania wszystkich funkcji zgodnie z wymaganiami PRD
- Zapewnienie, że aplikacja spełnia metryki sukcesu (≥85% konwersji onboarding, ≥4/5 ocena przydatności)
- Walidacja bezpieczeństwa uwierzytelniania i autoryzacji (RLS)
- Potwierdzenie zgodności z limitami biznesowymi (5 słówek/zestaw, 10 generacji/dzień)
- Osiągnięcie celów wydajnościowych (generacja ≤30s, uptime ≥99%)
- Zapewnienie dokładności sprawdzania tłumaczeń (≥90%)

### 1.4. Kontekst projektu
SmartWordsAI to aplikacja MVP wykorzystująca:
- **Frontend**: Astro 5, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth SDK, BaaS)
- **AI**: OpenRouter.ai (dostęp do wielu modeli LLM)
- **Architektura**: SSR (Server-Side Rendering) z API endpoints
- **Baza danych**: PostgreSQL z RLS (Row Level Security)

## 2. Zakres testów

### 2.1. Komponenty objęte testami

#### 2.1.1. Moduł Uwierzytelniania
- Rejestracja użytkownika (email + hasło)
- Logowanie i wylogowanie
- Reset i odzyskiwanie hasła
- Zarządzanie sesjami (HttpOnly cookies)
- Middleware autentykacji (/api/*, /app/*)

#### 2.1.2. Moduł Zarządzania Zestawami
- Tworzenie zestawów (nazwa, poziom CEFR, 1-5 słówek)
- Edycja zestawów (nazwa, poziom, słówka)
- Usuwanie zestawów (cascade delete)
- Listowanie z paginacją, wyszukiwaniem i filtrowaniem
- Walidacja unikalności nazw i słówek angielskich (en_norm)

#### 2.1.3. Moduł Generowania Zdań
- Wywołanie API OpenRouter z prompt'em
- Generowanie 2-3 zdań/słówko (max 15 słów/zdanie)
- Dostosowanie do poziomu CEFR
- Limit dzienny (10 generacji/użytkownik)
- Idempotencja (X-Idempotency-Key)
- Snapshot słówek w generation_runs

#### 2.1.4. Moduł Sesji Ćwiczeń
- Tworzenie sesji (set_id, generation_id)
- Tłumaczenie zdań (case/punctuation insensitive)
- Sprawdzanie odpowiedzi (artykuły a/an/the wymagane)
- Zapisywanie prób (attempts)
- Kończenie sesji (finished_at)
- System ocen (1-5 gwiazdek + komentarz)

#### 2.1.5. Dashboard
- Statystyki użytkownika (liczba zestawów, sesji)
- Kontynuacja ostatniej sesji
- Licznik dziennych generacji (X/10)
- Szybkie akcje (nowy zestaw, moje zestawy)

### 2.2. Komponenty wyłączone z testów MVP
- Analityka i historia nauki (out of scope)
- TTS/Wymowa (out of scope)
- Tryby specjalistyczne (Business English, idiomy)
- Eksport/Import danych
- Wersjonowanie zestawów
- Współdzielenie zestawów

### 2.3. Typy danych testowych
- Zestawy z 1, 3, 5 słówkami (granice limitu)
- Wszystkie poziomy CEFR (A1-C2)
- Znaki specjalne w słówkach (é, ñ, ü)
- Długie nazwy zestawów (100 znaków)
- Tłumaczenia z artykułami (a, an, the)
- Wielkie/małe litery, interpunkcja w odpowiedziach

## 3. Typy testów

### 3.1. Testy jednostkowe (Unit Tests)

#### 3.1.1. Zakres
- Funkcje pomocnicze (`normalize_en()`, `count_words()`)
- Schemy walidacji Zod (auth, sets, generation, sessions)
- Serwisy biznesowe (createSet, triggerGeneration, startSession)
- Mappery błędów (auth error mapper)

#### 3.1.2. Narzędzia
- **Framework**: Vitest (kompatybilny z Vite używanym przez Astro)
- **Mocking**: vi.mock() dla klientów Supabase i OpenRouter
- **Coverage**: ≥80% dla plików `src/lib/services/**/*.ts`

#### 3.1.3. Przykładowe testy
```typescript
// Normalizacja tekstu angielskiego
describe('normalize_en', () => {
  test('usuwa interpunkcję i konwertuje na małe litery', () => {
    expect(normalize_en("Hello, World!")).toBe("hello world");
  });
});

// Walidacja schematu tworzenia zestawu
describe('setCreateCommandSchema', () => {
  test('akceptuje 1-5 słówek', () => {
    const valid = { name: "Test", level: "A1", timezone: "Europe/Warsaw", words: [...] };
    expect(() => setCreateCommandSchema.parse(valid)).not.toThrow();
  });
  
  test('odrzuca 6 słówek', () => {
    const invalid = { ..., words: [6 words] };
    expect(() => setCreateCommandSchema.parse(invalid)).toThrow();
  });
});
```

### 3.2. Testy integracyjne (Integration Tests)

#### 3.2.1. Zakres
- API endpoints (/api/auth/*, /api/sets/*, /api/sessions/*)
- Integracja Supabase (auth + database)
- Przepływy danych między warstwami (API → Service → DB)
- Middleware autentykacji

#### 3.2.2. Narzędzia
- **Framework**: Vitest + Supertest (HTTP assertions)
- **Test DB**: Supabase Test Environment lub Docker Postgres
- **Mocking**: OpenRouter API (mock successful/error responses)

#### 3.2.3. Przykładowe testy
```typescript
describe('POST /api/sets', () => {
  test('tworzy zestaw dla zalogowanego użytkownika', async () => {
    const response = await request(app)
      .post('/api/sets')
      .set('Cookie', validSessionCookie)
      .send({ name: "Test Set", level: "B1", words: [...] });
    
    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Test Set");
  });
  
  test('zwraca 401 dla niezalogowanego użytkownika', async () => {
    const response = await request(app).post('/api/sets').send({...});
    expect(response.status).toBe(401);
  });
});
```

### 3.3. Testy end-to-end (E2E Tests)

#### 3.3.1. Zakres
- Pełne przepływy użytkownika (user journeys)
- Interakcje frontend-backend
- Renderowanie UI (Astro SSR + React islands)

#### 3.3.2. Narzędzia
- **Framework**: Playwright (wspiera SSR i React islands)
- **Browser**: Chromium, Firefox, WebKit (cross-browser)
- **Helpers**: Page Object Model (POM)

#### 3.3.3. Scenariusze testowe
Szczegółowe scenariusze w sekcji 4.

### 3.4. Testy bezpieczeństwa (Security Tests)

#### 3.4.1. Zakres
- Row Level Security (RLS) w Supabase
- Middleware autentykacji (chroni /api/*, /app/*)
- CSRF protection (HttpOnly cookies)
- SQL Injection (Supabase client parametryzuje zapytania)
- XSS (React auto-escapes, Astro sanitizes)

#### 3.4.2. Narzędzia
- **Manual Testing**: Próby dostępu do zasobów innych użytkowników
- **OWASP ZAP**: Skanowanie podatności (optional)

#### 3.4.3. Test cases
```typescript
test('użytkownik A nie może pobrać zestawu użytkownika B', async () => {
  const userBSetId = 'uuid-of-user-b-set';
  const response = await request(app)
    .get(`/api/sets/${userBSetId}`)
    .set('Cookie', userASessionCookie);
  
  expect(response.status).toBe(404); // RLS ukrywa istnienie
});
```

### 3.5. Testy wydajnościowe (Performance Tests)

#### 3.5.1. Zakres
- Czas generacji zdań (cel: ≤30s)
- Czas ładowania stron (dashboard, sets list)
- Concurrent requests (10 użytkowników jednocześnie)

#### 3.5.2. Narzędzia
- **Load Testing**: k6 (skryptowe testy obciążenia)
- **Profiling**: Chrome DevTools (lighthouse)

#### 3.5.3. Metryki
- **Generacja zdań**: p95 ≤30s, p99 ≤45s
- **API endpoints**: p95 ≤500ms (bez generacji)
- **Dashboard load**: First Contentful Paint ≤2s

### 3.6. Testy akceptacyjne (Acceptance Tests)

#### 3.6.1. Zakres
- Weryfikacja user stories (US-001 do US-012)
- Kryteria akceptacji z PRD
- Metryki sukcesu (konwersja onboarding ≥85%, ocena ≥4/5)

#### 3.6.2. Metoda
- Manual testing z rzeczywistymi użytkownikami (5-10 osób)
- Kwestionariusze (SUS - System Usability Scale)
- Analiza metryk z produkcji (po wdrożeniu)

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Uwierzytelnianie

#### TC-AUTH-001: Rejestracja nowego użytkownika
**Priorytet**: Krytyczny  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik nie jest zalogowany
- Email `newuser@test.com` nie istnieje w bazie

**Kroki**:
1. Przejdź do `/auth/register`
2. Wprowadź email: `newuser@test.com`
3. Wprowadź hasło: `SecurePass123!`
4. Kliknij "Zarejestruj się"

**Oczekiwany rezultat**:
- Status HTTP 201 na POST `/api/auth/signup`
- Użytkownik jest automatycznie zalogowany (sesja w cookies)
- Przekierowanie do `/app/dashboard`
- Wyświetlany komunikat: "Witaj w SmartWordsAI!"
- Rekord w tabeli `profiles` (user_id, timezone)

**Weryfikacja**:
```sql
SELECT * FROM auth.users WHERE email = 'newuser@test.com';
SELECT * FROM profiles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'newuser@test.com');
```

---

#### TC-AUTH-002: Logowanie istniejącego użytkownika
**Priorytet**: Krytyczny  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik `user@test.com` istnieje w bazie
- Hasło: `Password123`

**Kroki**:
1. Przejdź do `/auth/login`
2. Wprowadź email: `user@test.com`
3. Wprowadź hasło: `Password123`
4. Kliknij "Zaloguj się"

**Oczekiwany rezultat**:
- Status HTTP 200 na POST `/api/auth/login`
- Sesja zapisana w HttpOnly cookies
- Przekierowanie do `/app/dashboard`
- Dashboard wyświetla email użytkownika w menu

---

#### TC-AUTH-003: Reset hasła
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Kroki**:
1. POST `/api/auth/recover` z `{ "email": "user@test.com" }`
2. Sprawdź email (Supabase Auth wysyła link)
3. Kliknij link resetujący (zawiera `access_token` i `refresh_token`)
4. Przekierowanie do `/auth/reset-password`
5. Wprowadź nowe hasło: `NewSecure456!`
6. POST `/api/auth/reset-password` z `{ "password": "NewSecure456!" }`

**Oczekiwany rezultat**:
- Email z linkiem wysłany (sprawdź Supabase Auth logs)
- Status HTTP 200 na `/reset-password`
- Użytkownik może zalogować się nowym hasłem
- Stare hasło nie działa

---

#### TC-AUTH-004: Middleware chroni chronione ścieżki
**Priorytet**: Krytyczny  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik NIE jest zalogowany

**Kroki**:
1. GET `/app/dashboard` (bez cookies sesji)

**Oczekiwany rezultat**:
- Status HTTP 302 (redirect)
- Przekierowanie do `/auth/login?next=/app/dashboard`

**Kroki**:
2. GET `/api/sets` (bez cookies sesji)

**Oczekiwany rezultat**:
- Status HTTP 401
- Body: `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }`

---

### 4.2. Zarządzanie Zestawami

#### TC-SETS-001: Tworzenie zestawu z 3 słówkami
**Priorytet**: Krytyczny  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik zalogowany
- Zestaw o nazwie "Test A1" nie istnieje dla tego użytkownika

**Kroki**:
1. Przejdź do `/app/dashboard`
2. Kliknij "Nowy zestaw"
3. Wprowadź nazwę: "Test A1"
4. Wybierz poziom: A1
5. Dodaj słówka:
   - PL: "kot", EN: "cat"
   - PL: "pies", EN: "dog"
   - PL: "dom", EN: "house"
6. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Status HTTP 201 na POST `/api/sets`
- Przekierowanie do `/app/sets`
- Zestaw widoczny na liście z:
  - Nazwa: "Test A1"
  - Poziom: A1
  - Liczba słówek: 3
- W bazie:
  ```sql
  SELECT * FROM sets WHERE name = 'Test A1' AND user_id = :current_user_id;
  SELECT COUNT(*) FROM words WHERE set_id = :new_set_id; -- Oczekiwane: 3
  ```

---

#### TC-SETS-002: Walidacja limitu 5 słówek
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Kroki**:
1. POST `/api/sets` z 6 słówkami

**Oczekiwany rezultat**:
- Status HTTP 400
- Body: 
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Maximum 5 words allowed per set"
    }
  }
  ```

---

#### TC-SETS-003: Unikalność nazwy zestawu
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik posiada zestaw "Mój zestaw"

**Kroki**:
1. POST `/api/sets` z nazwą "Mój zestaw"

**Oczekiwany rezultat**:
- Status HTTP 409
- Body: 
  ```json
  {
    "error": {
      "code": "DUPLICATE_NAME",
      "message": "Set with this name already exists"
    }
  }
  ```

---

#### TC-SETS-004: Edycja zestawu - zmiana poziomu CEFR
**Priorytet**: Średni  
**Typ**: E2E

**Warunki wstępne**:
- Zestaw "Test A1" istnieje (poziom: A1)

**Kroki**:
1. Przejdź do `/app/sets/:setId`
2. Kliknij "Edytuj"
3. Zmień poziom z A1 na B2
4. Kliknij "Zapisz"

**Oczekiwany rezultat**:
- Status HTTP 200 na PATCH `/api/sets/:setId`
- Zestaw wyświetla poziom: B2
- W bazie: `SELECT level FROM sets WHERE id = :setId;` zwraca 'B2'

---

#### TC-SETS-005: Usuwanie zestawu (cascade delete)
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Warunki wstępne**:
- Zestaw :setId ma 3 słówka, 1 generation_run, 5 sentences

**Kroki**:
1. DELETE `/api/sets/:setId`

**Oczekiwany rezultat**:
- Status HTTP 204
- Zestaw usunięty z listy
- W bazie (wszystko usunięte przez CASCADE):
  ```sql
  SELECT COUNT(*) FROM sets WHERE id = :setId; -- 0
  SELECT COUNT(*) FROM words WHERE set_id = :setId; -- 0
  SELECT COUNT(*) FROM generation_runs WHERE set_id = :setId; -- 0
  SELECT COUNT(*) FROM sentences WHERE generation_id IN 
    (SELECT id FROM generation_runs WHERE set_id = :setId); -- 0
  ```

---

#### TC-SETS-006: Listowanie z wyszukiwaniem (prefix search)
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik posiada zestawy: "Animals A1", "Animals B2", "Food A2"

**Kroki**:
1. GET `/api/sets?search=Ani`

**Oczekiwany rezultat**:
- Status HTTP 200
- Body zawiera 2 zestawy: "Animals A1", "Animals B2"
- "Food A2" nie jest zwrócony

---

#### TC-SETS-007: Filtrowanie po poziomie CEFR
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik posiada zestawy: "Test A1" (A1), "Test B1" (B1), "Test C1" (C1)

**Kroki**:
1. GET `/api/sets?level=B1`

**Oczekiwany rezultat**:
- Status HTTP 200
- Body zawiera tylko "Test B1"

---

#### TC-SETS-008: Paginacja (cursor-based)
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik posiada 25 zestawów

**Kroki**:
1. GET `/api/sets?limit=10`
2. Zapisz `next_cursor` z odpowiedzi
3. GET `/api/sets?limit=10&cursor=:next_cursor`

**Oczekiwany rezultat**:
- Pierwszy request zwraca 10 zestawów + `next_cursor`
- Drugi request zwraca następne 10 zestawów (11-20)
- Brak duplikatów między stronami

---

### 4.3. Generowanie Zdań

#### TC-GEN-001: Generowanie zdań dla zestawu (happy path)
**Priorytet**: Krytyczny  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik zalogowany
- Zestaw "Test A1" ma 3 słówka: "cat", "dog", "house"
- Użytkownik wykorzystał 0/10 generacji dzisiaj
- OpenRouter API key poprawny

**Kroki**:
1. Przejdź do `/app/sets/:setId`
2. Kliknij "Generuj zdania"
3. System wysyła POST `/api/sets/:setId/generate` z:
   - Headers: `X-Idempotency-Key: uuid-v4`
   - Body: 
     ```json
     {
       "model_id": "openai/gpt-4o-mini",
       "temperature": 0.7,
       "prompt_version": "v1.0.0"
     }
     ```

**Oczekiwany rezultat**:
- Status HTTP 200 (czas odpowiedzi ≤30s)
- Body zawiera:
  - `generation_id` (UUID)
  - `sentences`: array of 6-9 zdań (2-3/słówko)
    - Każde zdanie ma: `sentence_id`, `word_id`, `pl_text`, `target_en`
    - `pl_text` ma ≤15 słów
  - `usage`: `{ tokens_in, tokens_out, cost_usd, remaining_generations_today: 9 }`
- W bazie:
  ```sql
  SELECT * FROM generation_runs WHERE set_id = :setId ORDER BY occurred_at DESC LIMIT 1;
  SELECT COUNT(*) FROM sentences WHERE generation_id = :generation_id; -- 6-9
  ```
- UI wyświetla "Generacja zakończona. Rozpocznij ćwiczenie"

---

#### TC-GEN-002: Limit dzienny (10 generacji)
**Priorytet**: Krytyczny  
**Typ**: Integracyjny

**Warunki wstępne**:
- Użytkownik wykorzystał 10/10 generacji dzisiaj

**Kroki**:
1. POST `/api/sets/:setId/generate`

**Oczekiwany rezultat**:
- Status HTTP 403
- Body:
  ```json
  {
    "error": {
      "code": "DAILY_LIMIT_REACHED",
      "message": "Daily generation limit reached (10 generations per day)."
    }
  }
  ```
- Dashboard wyświetla: "Osiągnąłeś dzienny limit generacji (10/10)"
- Przycisk "Generuj" jest nieaktywny (disabled)

---

#### TC-GEN-003: Idempotencja (duplicate request)
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Warunki wstępne**:
- Generacja z `X-Idempotency-Key: abc-123` została już wykonana (generation_id: `gen-001`)

**Kroki**:
1. POST `/api/sets/:setId/generate` z tym samym `X-Idempotency-Key: abc-123`

**Oczekiwany rezultat**:
- Status HTTP 200 (NIE 409)
- Body zwraca istniejącą generację (`generation_id: gen-001`)
- Licznik dziennych generacji NIE zwiększa się
- W bazie: `SELECT COUNT(*) FROM generation_runs WHERE idempotency_key = 'abc-123';` zwraca 1

---

#### TC-GEN-004: Brak słówek w zestawie
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Zestaw :setId ma `words_count = 0`

**Kroki**:
1. POST `/api/sets/:setId/generate`

**Oczekiwany rezultat**:
- Status HTTP 422
- Body:
  ```json
  {
    "error": {
      "code": "SET_HAS_NO_WORDS",
      "message": "Cannot generate sentences for an empty set. Add words first."
    }
  }
  ```

---

#### TC-GEN-005: OpenRouter API error (rate limit)
**Priorytet**: Wysoki  
**Typ**: Integracyjny (z mockiem)

**Warunki wstępne**:
- OpenRouter API zwraca HTTP 429

**Kroki**:
1. POST `/api/sets/:setId/generate`

**Oczekiwany rezultat**:
- Status HTTP 429
- Body:
  ```json
  {
    "error": {
      "code": "OPENROUTER_RATE_LIMIT",
      "message": "OpenRouter rate limit exceeded. Try again later."
    }
  }
  ```
- W bazie: generation_run utworzony, ale `tokens_in = 0` (failure state)

---

#### TC-GEN-006: Walidacja długości zdań (max 15 słów)
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Generacja zakończona sukcesem

**Kroki**:
1. Sprawdź wszystkie wygenerowane zdania w bazie:
   ```sql
   SELECT pl_text, pl_word_count FROM sentences WHERE generation_id = :generation_id;
   ```

**Oczekiwany rezultat**:
- Wszystkie zdania mają `pl_word_count ≤ 15`
- Jeśli jakiekolwiek zdanie ma >15 słów, test FAILS
- (To sprawdza constraint w bazie i prompt engineering)

---

#### TC-GEN-007: Snapshot słówek w generation_runs
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Zestaw ma słówka: "cat", "dog", "house"

**Kroki**:
1. POST `/api/sets/:setId/generate` (generacja 1)
2. Edytuj zestaw: zmień "cat" → "lion"
3. POST `/api/sets/:setId/generate` (generacja 2, nowy idempotency key)

**Oczekiwany rezultat**:
- Generacja 1 ma `words_snapshot = [{"pl":"kot","en":"cat"}, ...]`
- Generacja 2 ma `words_snapshot = [{"pl":"lew","en":"lion"}, ...]`
- Historie generacji są niezależne (immutable snapshots)

---

### 4.4. Sesje Ćwiczeń

#### TC-SESS-001: Rozpoczęcie sesji (automatyczne utworzenie)
**Priorytet**: Krytyczny  
**Typ**: E2E

**Warunki wstępne**:
- Zestaw :setId ma wygenerowane zdania (generation_id: `gen-001`)

**Kroki**:
1. POST `/api/sessions` z:
   ```json
   {
     "set_id": ":setId",
     "generation_id": "gen-001",
     "mode": "translate"
   }
   ```

**Oczekiwany rezultat**:
- Status HTTP 201
- Body zawiera:
  - `session_id` (UUID)
  - `sentences`: array zdań do tłumaczenia (pl_text)
  - `started_at` (timestamp)
- W bazie:
  ```sql
  SELECT * FROM exercise_sessions WHERE id = :session_id;
  -- finished_at = NULL
  ```
- Przekierowanie do `/app/sessions/:session_id`

---

#### TC-SESS-002: Sprawdzanie odpowiedzi (poprawna)
**Priorytet**: Krytyczny  
**Typ**: Integracyjny

**Warunki wstępne**:
- Sesja :sessionId aktywna
- Zdanie: "Kot siedzi na macie" → target: "The cat sits on the mat"

**Kroki**:
1. POST `/api/sessions/:sessionId/attempts` z:
   ```json
   {
     "sentence_id": ":sentenceId",
     "answer_raw": "The cat sits on the mat"
   }
   ```

**Oczekiwany rezultat**:
- Status HTTP 200
- Body:
  ```json
  {
    "is_correct": true,
    "normalized_answer": "the cat sits on the mat",
    "normalized_target": "the cat sits on the mat",
    "feedback": "Poprawnie! 🎉"
  }
  ```
- W bazie:
  ```sql
  SELECT * FROM attempts WHERE sentence_id = :sentenceId ORDER BY checked_at DESC LIMIT 1;
  -- is_correct = true
  ```

---

#### TC-SESS-003: Sprawdzanie odpowiedzi (błąd - brak artykułu)
**Priorytet**: Krytyczny  
**Typ**: Integracyjny

**Warunki wstępne**:
- Zdanie: "Kot siedzi na macie" → target: "The cat sits on the mat"

**Kroki**:
1. POST `/api/sessions/:sessionId/attempts` z:
   ```json
   {
     "sentence_id": ":sentenceId",
     "answer_raw": "Cat sits on mat"
   }
   ```

**Oczekiwany rezultat**:
- Status HTTP 200
- Body:
  ```json
  {
    "is_correct": false,
    "normalized_answer": "cat sits on mat",
    "normalized_target": "the cat sits on the mat",
    "diff": [
      { "type": "missing", "value": "the" },
      { "type": "match", "value": "cat" },
      ...
    ],
    "feedback": "Brakuje artykułów: 'the' przed 'cat', 'the' przed 'mat'"
  }
  ```
- W bazie: `is_correct = false`

---

#### TC-SESS-004: Case/punctuation insensitive
**Priorytet**: Wysoki  
**Typ**: Integracyjny

**Warunki wstępne**:
- Target: "The cat sits on the mat"

**Kroki**:
1. Użytkownik wprowadza: `"THE CAT SITS ON THE MAT!!!"`

**Oczekiwany rezultat**:
- Status HTTP 200
- `is_correct = true` (normalizacja: lowercase + remove punctuation)

---

#### TC-SESS-005: Kończenie sesji
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Sesja :sessionId aktywna (`finished_at = NULL`)

**Kroki**:
1. PATCH `/api/sessions/:sessionId/finish` z:
   ```json
   {
     "completed_reason": "all_sentences_answered"
   }
   ```

**Oczekiwany rezultat**:
- Status HTTP 200
- Body: `{ "message": "Session finished successfully" }`
- W bazie:
  ```sql
  SELECT finished_at FROM exercise_sessions WHERE id = :sessionId;
  -- finished_at = now() (not NULL)
  ```
- Przekierowanie do formularza oceny

---

#### TC-SESS-006: Ocena sesji (1-5 gwiazdek)
**Priorytet**: Średni  
**Typ**: Integracyjny

**Warunki wstępne**:
- Sesja :sessionId zakończona (`finished_at IS NOT NULL`)

**Kroki**:
1. POST `/api/sessions/:sessionId/rate` z:
   ```json
   {
     "stars": 4
   }
   ```

**Oczekiwany rezultat**:
- Status HTTP 201
- Body: `{ "message": "Rating submitted" }`
- W bazie:
  ```sql
  SELECT * FROM ratings WHERE session_id = :sessionId;
  -- stars = 4
  ```

---

#### TC-SESS-007: Walidacja oceny (1-5 zakres)
**Priorytet**: Niski  
**Typ**: Integracyjny

**Kroki**:
1. POST `/api/sessions/:sessionId/rate` z `{ "stars": 6 }`

**Oczekiwany rezultat**:
- Status HTTP 400
- Body:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Stars must be between 1 and 5"
    }
  }
  ```

---

### 4.5. Dashboard

#### TC-DASH-001: Wyświetlanie licznika generacji
**Priorytet**: Wysoki  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik wykorzystał 3/10 generacji dzisiaj

**Kroki**:
1. Przejdź do `/app/dashboard`

**Oczekiwany rezultat**:
- Komponent `GenerationCounter` wyświetla: "3/10 generacji dzisiaj"
- Progres bar: 30% wypełnienia

---

#### TC-DASH-002: Kontynuacja ostatniej sesji
**Priorytet**: Średni  
**Typ**: E2E

**Warunki wstępne**:
- Użytkownik ma aktywną sesję :sessionId (`finished_at = NULL`)

**Kroki**:
1. Przejdź do `/app/dashboard`
2. Kliknij "Kontynuuj ćwiczenie"

**Oczekiwany rezultat**:
- Dashboard wyświetla kartę `ContinueSessionCard` z:
  - Nazwa zestawu
  - Liczba pozostałych zdań
- Kliknięcie przekierowuje do `/app/sessions/:sessionId`

---

## 5. Środowisko testowe

### 5.1. Środowiska

#### 5.1.1. Lokalne (Development)
- **URL**: http://localhost:3000
- **Baza danych**: Supabase Local (Docker) lub Supabase Cloud (dev project)
- **Auth**: Supabase Auth (dev project)
- **OpenRouter**: Test API key (z limitem $5)
- **Użycie**: Testy jednostkowe, integracyjne, debugging

#### 5.1.2. Staging
- **URL**: https://staging.smartwordsai.com
- **Baza danych**: Supabase Cloud (staging project)
- **Auth**: Supabase Auth (staging, emaile z testowym suffiksem)
- **OpenRouter**: Staging API key (z limitem $50)
- **Użycie**: Testy E2E, akceptacyjne, load testing

#### 5.1.3. Produkcja
- **URL**: https://app.smartwordsai.com
- **Baza danych**: Supabase Cloud (production project)
- **Auth**: Supabase Auth (produkcja)
- **OpenRouter**: Production API key (z budżetem)
- **Użycie**: Smoke tests po deployment, monitoring

### 5.2. Dane testowe

#### 5.2.1. Użytkownicy testowi
```
user1@test.com / Password123 (0 zestawów)
user2@test.com / Password123 (10 zestawów, różne poziomy)
user3@test.com / Password123 (10/10 generacji dzisiaj - do testów limitu)
admin@test.com / AdminPass456 (dostęp do metryk)
```

#### 5.2.2. Zestawy testowe
```
"Animals A1" (level: A1, words: cat, dog, bird)
"Food B1" (level: B1, words: apple, bread, water, cheese, milk)
"Travel C2" (level: C2, words: itinerary, accommodation, departure)
"Empty Set" (level: A2, words_count: 0 - do testów błędów)
```

### 5.3. Konfiguracja

#### 5.3.1. Zmienne środowiskowe (.env.test)
```bash
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-test-...
NODE_ENV=test
```

#### 5.3.2. Seed script (test-seed.sql)
```sql
-- Tworzy użytkowników testowych, zestawy, generacje
INSERT INTO profiles (user_id, timezone) VALUES ...;
INSERT INTO sets (user_id, name, level, words_count) VALUES ...;
-- ...
```

## 6. Narzędzia do testowania

### 6.1. Framework testowy

#### 6.1.1. Vitest (Testy jednostkowe + integracyjne)
- **Wersja**: ^2.0.0
- **Config**: `vitest.config.ts`
  ```typescript
  import { defineConfig } from 'vitest/config';
  
  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', '**/*.test.ts']
      }
    }
  });
  ```
- **Uruchamianie**: `npm run test:unit`

#### 6.1.2. Playwright (Testy E2E)
- **Wersja**: ^1.48.0
- **Browsers**: Chromium, Firefox, WebKit
- **Config**: `playwright.config.ts`
  ```typescript
  import { defineConfig } from '@playwright/test';
  
  export default defineConfig({
    testDir: './tests/e2e',
    use: {
      baseURL: 'http://localhost:3000',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure'
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
    ]
  });
  ```
- **Uruchamianie**: `npm run test:e2e`

### 6.2. Narzędzia pomocnicze

#### 6.2.1. Supertest (HTTP assertions)
```typescript
import request from 'supertest';

test('GET /api/sets returns 200', async () => {
  const response = await request(app).get('/api/sets').set('Cookie', validCookie);
  expect(response.status).toBe(200);
});
```

#### 6.2.2. Faker.js (Generowanie danych testowych)
```typescript
import { faker } from '@faker-js/faker';

const testUser = {
  email: faker.internet.email(),
  password: faker.internet.password()
};
```

#### 6.2.3. k6 (Load testing)
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s'
};

export default function () {
  let res = http.get('https://staging.smartwordsai.com/api/sets');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```
- **Uruchamianie**: `k6 run tests/load/api-sets.js`

### 6.3. CI/CD Integration

#### 6.3.1. GitHub Actions workflow (.github/workflows/test.yml)
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.14.0'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 7. Harmonogram testów

### 7.1. Fazy testowania

#### Faza 1: Testy developerskie (ciągłe)
- **Częstotliwość**: Przy każdym commit/PR
- **Zakres**: Testy jednostkowe + linting
- **Czas**: ~3-5 minut
- **Responsible**: Deweloperzy + CI/CD

#### Faza 2: Testy integracyjne (daily)
- **Częstotliwość**: Codziennie (nightly build)
- **Zakres**: Pełny test suite (unit + integration)
- **Czas**: ~15-20 minut
- **Responsible**: CI/CD

#### Faza 3: Testy E2E (przed merge do main)
- **Częstotliwość**: Przed każdym merge do `main` branch
- **Zakres**: Krytyczne user journeys (10-15 scenariuszy)
- **Czas**: ~10 minut
- **Responsible**: CI/CD + QA review

#### Faza 4: Testy regresyjne (przed deployment)
- **Częstotliwość**: Przed każdym deploymentem na staging/production
- **Zakres**: Pełny E2E suite (wszystkie scenariusze)
- **Czas**: ~30-45 minut
- **Responsible**: QA team

#### Faza 5: Testy akceptacyjne (post-deployment)
- **Częstotliwość**: Po deployment na production
- **Zakres**: Smoke tests + manual verification
- **Czas**: ~1 godzina
- **Responsible**: QA team + Product Owner

### 7.2. Milestone'y MVP

#### Sprint 1 (Tygodnie 1-2)
- Implementacja testów jednostkowych dla auth schemas
- Setup Playwright + pierwsze testy E2E (rejestracja/login)
- **Exit criteria**: 80% coverage dla `src/lib/schemas/auth.ts`

#### Sprint 2 (Tygodnie 3-4)
- Testy integracyjne dla API sets
- E2E dla tworzenia/edycji zestawów
- **Exit criteria**: Wszystkie TC-SETS-* przechodzą

#### Sprint 3 (Tygodnie 5-6)
- Testy integracyjne dla generacji (z mockiem OpenRouter)
- E2E dla generacji + limitu dziennego
- **Exit criteria**: TC-GEN-001 do TC-GEN-004 przechodzą

#### Sprint 4 (Tygodnie 7-8)
- Testy dla sesji ćwiczeń + sprawdzania odpowiedzi
- Testy bezpieczeństwa (RLS verification)
- **Exit criteria**: Wszystkie TC-SESS-* przechodzą

#### Sprint 5 (Tydzień 9)
- Load testing (k6)
- Performance optimization
- **Exit criteria**: Generacja ≤30s (p95)

#### Sprint 6 (Tydzień 10)
- Testy akceptacyjne z użytkownikami (5-10 osób)
- Bug fixing based on feedback
- **Exit criteria**: ≥85% konwersji onboarding, ≥4/5 ocena

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia (Entry Criteria)

Przed rozpoczęciem testów muszą być spełnione:

1. **Środowisko**:
   - Staging environment działający i dostępny
   - Supabase Auth skonfigurowane (emaile testowe działają)
   - OpenRouter API key z budżetem ≥$10
   - Seed data załadowane (użytkownicy + zestawy testowe)

2. **Kod**:
   - Funkcjonalność zaimplementowana zgodnie z US
   - Build przechodzi bez błędów (`npm run build`)
   - Linter nie zgłasza błędów (`npm run lint`)

3. **Dokumentacja**:
   - API endpoints udokumentowane (request/response schemas)
   - User stories zaktualizowane

### 8.2. Kryteria wyjścia (Exit Criteria)

Testowanie uznaje się za zakończone, gdy:

1. **Coverage**:
   - Testy jednostkowe: ≥80% coverage dla `src/lib/**/*.ts`
   - Testy E2E: Wszystkie krytyczne scenariusze (TC-*-001 do TC-*-005) przechodzą

2. **Błędy**:
   - 0 błędów krytycznych (blocker)
   - 0 błędów wysokiego priorytetu
   - ≤5 błędów średniego priorytetu (z planem naprawy)

3. **Wydajność**:
   - Generacja zdań: p95 ≤30s
   - API endpoints (bez generacji): p95 ≤500ms
   - Dashboard load: FCP ≤2s

4. **Bezpieczeństwo**:
   - Wszystkie testy RLS przechodzą (TC-AUTH-004)
   - Brak podatności OWASP Top 10

5. **Akceptacja użytkownika**:
   - ≥85% testerów kończy pełny onboarding flow (rejestracja → generacja → ćwiczenie)
   - Średnia ocena użyteczności (SUS): ≥68/100
   - Średnia ocena jakości zdań: ≥4/5

### 8.3. Procedura zatwierdzania (Sign-off)

| Rola | Odpowiedzialność | Kryteria zatwierdzenia |
|------|-----------------|------------------------|
| **QA Lead** | Weryfikacja pełnego test suite | Wszystkie exit criteria spełnione |
| **Tech Lead** | Code review + performance review | Code quality + wydajność OK |
| **Product Owner** | User acceptance | Metryki sukcesu osiągnięte |
| **DevOps** | Deployment readiness | CI/CD pipelines działają, monitoring setup |

## 9. Role i odpowiedzialności

### 9.1. Zespół testowy

#### 9.1.1. QA Lead
- **Odpowiedzialności**:
  - Tworzenie i aktualizacja planu testów
  - Definiowanie test cases + priorytetyzacja
  - Koordynacja testów akceptacyjnych z użytkownikami
  - Raportowanie metryk testowych (coverage, pass rate)
- **Narzędzia**: Jira, Playwright, Vitest

#### 9.1.2. QA Engineers (2 osoby)
- **Odpowiedzialności**:
  - Implementacja testów E2E (Playwright)
  - Wykonywanie testów manualnych (eksploracyjne)
  - Regression testing przed deployment
  - Raportowanie błędów w Jira
- **Narzędzia**: Playwright, Postman, DevTools

#### 9.1.3. Deweloperzy
- **Odpowiedzialności**:
  - Implementacja testów jednostkowych (Vitest)
  - Implementacja testów integracyjnych dla API
  - Fix błędów zgłoszonych przez QA
  - Code review testów
- **Narzędzia**: Vitest, Jest, Supertest

#### 9.1.4. DevOps Engineer
- **Odpowiedzialności**:
  - Setup CI/CD pipelines (GitHub Actions)
  - Monitoring środowisk testowych (uptime, performance)
  - Setup load testing infrastructure (k6)
  - Deployment automatyzacja (staging + production)
- **Narzędzia**: GitHub Actions, k6, Grafana

### 9.2. Macierz RACI

| Aktywność | QA Lead | QA Eng | Dev | DevOps | PO |
|-----------|---------|--------|-----|--------|---|
| **Plan testów** | A/R | C | C | I | A |
| **Testy jednostkowe** | I | I | R/A | I | I |
| **Testy E2E** | R/A | R/A | C | I | I |
| **Testy akceptacyjne** | R/A | R | I | I | A |
| **Raportowanie błędów** | A | R | C | I | I |
| **Fixing błędów** | C | I | R/A | C | I |
| **Load testing** | R/A | C | C | R/A | I |
| **Deployment testing** | R | R | C | R/A | A |

**Legenda**: R = Responsible, A = Accountable, C = Consulted, I = Informed

## 10. Procedury raportowania błędów

### 10.1. Priorytety błędów

#### P0 - Krytyczny (Blocker)
- **Definicja**: Aplikacja nie działa lub funkcjonalność kluczowa całkowicie zablokowana
- **Przykłady**:
  - Nie można się zalogować (100% użytkowników)
  - Baza danych niedostępna
  - Generacja zdań zawsze kończy się błędem 500
- **SLA**: Fix w ≤4 godziny, deployment emergency
- **Procedura**: Natychmiastowy kontakt z Dev + DevOps (Slack alert)

#### P1 - Wysoki
- **Definicja**: Funkcjonalność kluczowa działa, ale z poważnymi ograniczeniami
- **Przykłady**:
  - Nie można utworzyć zestawu z 5 słówkami (limit nie działa)
  - Limit dzienny generacji nie resetuje się o północy
  - Sprawdzanie odpowiedzi zawsze zwraca "incorrect"
- **SLA**: Fix w sprint'cie (1-2 tygodnie)
- **Procedura**: Bug ticket w Jira, przypisanie do Dev

#### P2 - Średni
- **Definicja**: Funkcjonalność działa, ale UX jest utrudniony
- **Przykłady**:
  - Błędy walidacji nie wyświetlają się użytkownikowi
  - Dashboard ładuje się >5s
  - Generacja trwa 35s (powyżej SLA 30s)
- **SLA**: Fix w następnym sprint'cie
- **Procedura**: Bug ticket w Jira (backlog)

#### P3 - Niski
- **Definicja**: Drobne błędy UI, typo, edge cases
- **Przykłady**:
  - Błąd ortograficzny w komunikacie
  - Ikona źle wyrównana
  - Tooltip nie znika po kliknięciu
- **SLA**: Fix gdy jest czas (nice-to-have)
- **Procedura**: Bug ticket w Jira (low priority backlog)

### 10.2. Szablon raportu błędu (Jira)

```
**Tytuł**: [Komponent] Krótki opis błędu (np. "[Auth] Nie można zresetować hasła")

**Priorytet**: P0 / P1 / P2 / P3

**Środowisko**:
- URL: https://staging.smartwordsai.com
- Browser: Chrome 120.0.0 (lub Firefox, Safari)
- User: user1@test.com
- Timestamp: 2024-01-15 14:23 UTC

**Kroki do reprodukcji**:
1. Przejdź do /auth/forgot-password
2. Wprowadź email: user1@test.com
3. Kliknij "Wyślij link resetujący"
4. Sprawdź email (nie przychodzi)

**Oczekiwany rezultat**:
- Email z linkiem resetującym zostaje wysłany w ≤2 minuty
- Link jest aktywny przez 24h

**Faktyczny rezultat**:
- Email nie przychodzi (sprawdzono spam folder)
- Supabase Auth logs pokazują error 500

**Dodatkowe informacje**:
- Screenshots: [załącz lub link do Cloudinary]
- Console logs: `Error: Failed to send email...`
- Network tab: POST /api/auth/recover returns 500

**Testowane na**:
- [ ] Chromium
- [x] Firefox
- [ ] Safari
- [x] Mobile (Android Chrome)

**Severity**: Krytyczny (użytkownik nie może odzyskać hasła)

**Assignee**: @dev-team-member
**Labels**: bug, auth, p1
```

### 10.3. Workflow błędów (Jira)

1. **New** → QA tworzy ticket, wypełnia template
2. **Triage** → QA Lead + Tech Lead weryfikują priorytet (daily standup)
3. **Assigned** → Przypisanie do Dev (sprint planning)
4. **In Progress** → Dev pracuje nad fixem
5. **In Review** → Code review + QA weryfikuje fix (staging)
6. **Resolved** → Merged do main, wdrożone na production
7. **Closed** → QA wykonuje regression test i zamyka ticket

### 10.4. Kanały komunikacji

- **Slack**:
  - `#bugs-critical` (P0 - natychmiastowe alerty)
  - `#bugs-high-priority` (P1)
  - `#qa-daily` (codzienne podsumowanie testów)
- **Jira**: Wszystkie bug tickets (tracking)
- **Email**: Weekly QA report (do PO + stakeholders)

## 11. Metryki i raportowanie

### 11.1. Metryki testowe (tracking)

#### 11.1.1. Test Coverage
```
Cel: ≥80% line coverage dla src/lib/**/*.ts
Pomiar: Vitest coverage report
Częstotliwość: Po każdym PR merge
```

#### 11.1.2. Test Pass Rate
```
Cel: ≥95% testów przechodzi (CI/CD)
Pomiar: GitHub Actions + Playwright HTML report
Częstotliwość: Po każdym test run
```

#### 11.1.3. Defect Density
```
Cel: ≤5 bugów/1000 LOC
Pomiar: Jira (liczba bugów / SLOC)
Częstotliwość: Tygodniowo
```

#### 11.1.4. Mean Time To Resolution (MTTR)
```
Cel: ≤24h dla P1, ≤1 tydzień dla P2
Pomiar: Jira (czas od "New" do "Resolved")
Częstotliwość: Miesięcznie (retrospektywa)
```

### 11.2. Raporty

#### 11.2.1. Daily QA Report (Slack)
```
📊 Daily QA Update - 2024-01-15

✅ Tests Passed: 142/150 (94.7%)
❌ Tests Failed: 8/150
  - TC-GEN-002 (daily limit) - FLAKY (investigating)
  - TC-SESS-003 (article check) - BUG FILED (SWAI-234)

🐛 New Bugs: 2 (P1: 1, P2: 1)
✔️ Bugs Resolved: 3

🎯 Coverage: 82.3% (+1.2% vs yesterday)

🚧 Blockers: None
```

#### 11.2.2. Weekly QA Summary (Email)
```
Subject: Weekly QA Report - Week 3, Jan 2024

Summary:
- Test execution: 750 tests run (95% pass rate)
- Code coverage: 82% (target: 80%) ✅
- Bugs found: 12 (P0: 0, P1: 3, P2: 6, P3: 3)
- Bugs resolved: 15
- MTTR (P1): 18h (target: 24h) ✅

Key Achievements:
- E2E test suite expanded to 45 scenarios (+10 vs last week)
- Load testing completed: p95 response time 28s (target: ≤30s) ✅

Blockers:
- None

Next Week Focus:
- Implement security tests (RLS verification)
- User acceptance testing (recruit 5 testers)
```

#### 11.2.3. Sprint Retrospective Report
```
Sprint 3 QA Retrospective

Metrics:
- Velocity: 42 story points completed
- Bugs introduced: 8 (vs 12 last sprint) ↓
- Test automation: 85% (target: 80%) ✅
- Test debt: 5 missing tests (TC-DASH-003 to 007)

What went well:
+ Fast bug resolution (MTTR 16h for P1)
+ Good collaboration Dev-QA (daily syncs)

What to improve:
- Flaky tests (TC-GEN-002 fails 20% of time)
- Missing tests for Dashboard components

Action items:
1. Fix flaky test (add wait for rate limit reset) - @qa-engineer
2. Implement Dashboard E2E tests - @qa-engineer-2
3. Setup nightly regression suite - @devops
```

## 12. Zarządzanie ryzykiem

### 12.1. Zidentyfikowane ryzyka testowe

#### Ryzyko 1: Zależność od OpenRouter API
- **Opis**: Testy generacji są zależne od zewnętrznej usługi OpenRouter, która może być niedostępna lub zwracać błędy
- **Wpływ**: Wysoki (blokuje testy E2E dla generacji)
- **Prawdopodobieństwo**: Średnie (API może mieć downtime)
- **Mitygacja**:
  - Implementacja mocków OpenRouter dla testów integracyjnych
  - Retry logic (3 próby z exponential backoff)
  - Alerting gdy OpenRouter zwraca >10% błędów w CI/CD
- **Plan awaryjny**: Skip generacji tests gdy OpenRouter down, manual verification

#### Ryzyko 2: Flaky tests (niestabilne testy)
- **Opis**: Testy E2E mogą być niestabilne (timing issues, race conditions)
- **Wpływ**: Średni (fałszywe alarmy, zmniejsza zaufanie do CI/CD)
- **Prawdopodobieństwo**: Wysokie (typowe dla testów E2E)
- **Mitygacja**:
  - Playwright auto-wait (waits for elements to be actionable)
  - Explicit waits dla async operations (generacji, API calls)
  - Retry mechanism (2 rerun on failure)
  - Identyfikacja flaky tests (track pass rate <95%)
- **Plan awaryjny**: Quarantine flaky tests (przenieś do osobnego suite)

#### Ryzyko 3: Brak danych testowych (seed data)
- **Opis**: Środowisko staging nie ma wystarczających danych testowych (zestawy, generacje)
- **Wpływ**: Średni (niektóre testy nie mogą być wykonane)
- **Prawdopodobieństwo**: Średnie (staging może być resetowany)
- **Mitygacja**:
  - Automatyczny seed script (`test-seed.sql`) run na staging deploy
  - Setup data w test beforeAll hooks (Playwright)
  - Backup staging DB przed reset
- **Plan awaryjny**: Manual seed execution (`npm run seed:staging`)

#### Ryzyko 4: Limit dzienny generacji w testach
- **Opis**: Testy E2E mogą wyczerpać limit 10 generacji/użytkownik, blokując kolejne testy
- **Wpływ**: Wysoki (blokuje testy generacji)
- **Prawdopodobieństwo**: Wysokie (jeśli wiele testów działa równolegle)
- **Mitygacja**:
  - Osobni użytkownicy testowi dla każdego test case (user1, user2, ...)
  - Reset limitu w beforeEach hook (manualne ustawienie `occurred_at` w przeszłości)
  - Izolacja testów (cleanup after each test)
- **Plan awaryjny**: Admin endpoint do reset limitu (`POST /api/admin/reset-daily-limit`)

#### Ryzyko 5: Wydajność testów (długi czas wykonania)
- **Opis**: Pełny test suite może trwać >1h, spowalnia CI/CD
- **Wpływ**: Średni (opóźnia feedback loop)
- **Prawdopodobieństwo**: Wysokie (w miarę rozrostu test suite)
- **Mitygacja**:
  - Równoległe wykonywanie testów (Playwright workers: 4)
  - Selective test runs (tylko testy związane z zmianami w PR)
  - Nightly full regression (zamiast przy każdym commit)
  - Caching dependencies w CI/CD (npm ci cache)
- **Plan awaryjny**: Split test suite na smoke tests (5 min) + full regression (1h nightly)

### 12.2. Matryca ryzyka

| Ryzyko | Prawdopodobieństwo | Wpływ | Priorytet | Status mitygacji |
|--------|-------------------|-------|-----------|------------------|
| OpenRouter API dependency | Średnie | Wysoki | **P1** | ✅ Zaimplementowano mocki |
| Flaky tests | Wysokie | Średni | **P1** | 🔄 W trakcie (retry logic) |
| Brak seed data | Średnie | Średni | **P2** | ✅ Seed script gotowy |
| Limit dzienny w testach | Wysokie | Wysoki | **P1** | ✅ Osobni użytkownicy |
| Długi czas testów | Wysokie | Średni | **P2** | 🔄 W trakcie (parallelization) |

## 13. Załączniki

### 13.1. Checklist przed deployment

```markdown
## Pre-Deployment Testing Checklist

### Code Quality
- [ ] All linters pass (ESLint, Prettier)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] Code coverage ≥80%
- [ ] Code review approved (≥2 approvals)

### Testing
- [ ] All unit tests pass (Vitest)
- [ ] All integration tests pass
- [ ] All E2E tests pass (Playwright)
- [ ] No P0/P1 bugs open in Jira
- [ ] Regression testing completed

### Performance
- [ ] Generacja zdań: p95 ≤30s (k6 load test)
- [ ] API endpoints: p95 ≤500ms
- [ ] Lighthouse score ≥90 (Performance)

### Security
- [ ] RLS policies verified (manual test)
- [ ] No credentials in code (secrets scan)
- [ ] OWASP Top 10 check passed

### Documentation
- [ ] API docs updated (if endpoints changed)
- [ ] Changelog updated (CHANGELOG.md)
- [ ] User-facing changes documented

### Environment
- [ ] Staging deployment successful
- [ ] Smoke tests pass on staging
- [ ] Backup created (DB snapshot)
- [ ] Rollback plan ready

### Stakeholder Approval
- [ ] QA Lead sign-off
- [ ] Tech Lead sign-off
- [ ] Product Owner sign-off

**Deployment approved by**: _________________  
**Date**: _________________
```

### 13.2. Test data generator

```typescript
// tests/utils/testDataGenerator.ts
import { faker } from '@faker-js/faker';

export function generateTestUser() {
  return {
    email: faker.internet.email(),
    password: 'TestPass123!',
    timezone: 'Europe/Warsaw'
  };
}

export function generateTestSet(level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') {
  return {
    name: faker.lorem.words(2),
    level,
    words: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      pl: faker.lorem.word(),
      en: faker.lorem.word()
    }))
  };
}
```

### 13.3. Przykładowe Page Objects (Playwright)

```typescript
// tests/e2e/pages/LoginPage.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/app/dashboard');
  }
}

// tests/e2e/pages/DashboardPage.ts
export class DashboardPage {
  constructor(private page: Page) {}

  async getGenerationCounter() {
    const text = await this.page.locator('[data-testid="generation-counter"]').textContent();
    return text; // "3/10 generacji dzisiaj"
  }

  async clickCreateSet() {
    await this.page.click('[data-testid="create-set-button"]');
    await this.page.waitForURL('/app/sets/new');
  }
}
```

### 13.4. CI/CD workflow diagram

```
┌─────────────┐
│ Git Push    │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────┐
│ GitHub Actions: Lint & Build        │
│ - ESLint                             │
│ - Prettier check                     │
│ - npm run build                      │
└──────┬──────────────────────────────┘
       │ (if pass)
       v
┌─────────────────────────────────────┐
│ Unit Tests (Vitest)                  │
│ - src/lib/services/**/*.test.ts     │
│ - Coverage report → Codecov         │
└──────┬──────────────────────────────┘
       │ (if pass)
       v
┌─────────────────────────────────────┐
│ Integration Tests (Vitest + Supertest) │
│ - API endpoints tests                │
└──────┬──────────────────────────────┘
       │ (if pass)
       v
┌─────────────────────────────────────┐
│ E2E Tests (Playwright)               │
│ - Critical user journeys (10 tests)  │
│ - Parallel: 4 workers                │
└──────┬──────────────────────────────┘
       │ (if pass)
       v
┌─────────────────────────────────────┐
│ Deploy to Staging                    │
│ - DigitalOcean (Docker)              │
│ - Run seed script                    │
└──────┬──────────────────────────────┘
       │ (manual approval)
       v
┌─────────────────────────────────────┐
│ Smoke Tests on Staging               │
│ - 5 critical scenarios               │
└──────┬──────────────────────────────┘
       │ (if pass + PO approval)
       v
┌─────────────────────────────────────┐
│ Deploy to Production                 │
│ - Blue/Green deployment              │
│ - Health check                       │
└─────────────────────────────────────┘
```

---

## Podsumowanie

Niniejszy plan testów definiuje kompleksową strategię zapewnienia jakości aplikacji SmartWordsAI. Kluczowe elementy:

1. **Pokrycie testowe**: Testy jednostkowe (≥80%), integracyjne (API), E2E (user journeys), bezpieczeństwa (RLS), wydajnościowe (≤30s generacja)
2. **Narzędzia**: Vitest (unit/integration), Playwright (E2E), k6 (load), GitHub Actions (CI/CD)
3. **Harmonogram**: Ciągłe testy przy każdym commit/PR, nightly regression, akceptacyjne przed produkcją
4. **Kryteria sukcesu**: ≥85% konwersji onboarding, ≥4/5 ocena jakości, ≥90% dokładność sprawdzania, uptime ≥99%
5. **Zarządzanie ryzykiem**: Mocki dla OpenRouter, retry dla flaky tests, izolacja testów (seed data + osobni użytkownicy)

Plan będzie aktualizowany w miarę rozwoju projektu i zbierania feedbacku z testów.

**Dokument zatwierdzony przez**:
- QA Lead: _________________
- Tech Lead: _________________
- Product Owner: _________________

**Data**: 2024-01-31  
**Wersja**: 1.0
