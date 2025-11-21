# API Endpoint Implementation Plan: POST /api/sets

## 1. Przegląd punktu końcowego

Endpoint tworzy nowy zestaw słówek z maksymalnie 5 początkowymi słowami. Wymusza unikalność nazwy na poziomie użytkownika oraz waliduje poziom CEFR.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **URL**: `/api/sets`
- **Content-Type**: `application/json`
- **Parametry**:
  - **Wymagane w body**:
    | Pole | Typ | Opis |
    |------|-----|------|
    | `name` | `string` | Nazwa zestawu (unikalna na użytkownika). |
    | `level` | `CEFRLevel` | Poziom językowy (A1-C2). |
    | `timezone` | `string` | Strefa czasowa użytkownika (np. "Europe/Warsaw"). |
    | `words` | `WordCreateInput[]` | Tablica 1-5 słówek. |
  
  - **Struktura `WordCreateInput`**:
    | Pole | Typ | Wymagane | Opis |
    |------|-----|----------|------|
    | `pl` | `string` | Tak | Polskie słowo/wyrażenie. |
    | `en` | `string` | Tak | Angielskie tłumaczenie. |
    | `position` | `number` | Nie | Pozycja w zestawie (1-5). Jeśli brak, auto-przypisywana. |

**Przykład body**:
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

## 3. Wykorzystywane typy

| Nazwa | Plik | Rola |
|-------|------|------|
| `SetCreateCommand` | `src/types.ts` | Typ body żądania. |
| `WordCreateInput` | `src/types.ts` | Typ pojedynczego słówka w zestawie. |
| `SetCreateResponseDTO` (= `SetSummaryDTO`) | `src/types.ts` | Odpowiedź HTTP. |
| `TablesInsert<'sets'>` | `src/db/database.types.ts` | Typ wstawiany do tabeli `sets`. |
| `TablesInsert<'words'>` | `src/db/database.types.ts` | Typ wstawiany do tabeli `words`. |

## 4. Szczegóły odpowiedzi

- **Status sukcesu**: `201 Created`
- **Nagłówek**: `Content-Type: application/json; charset=utf-8`
- **Body**: `SetCreateResponseDTO`
```json
{
  "id": "uuid",
  "name": "Food Basics",
  "level": "A2",
  "words_count": 2,
  "created_at": "2025-11-14T10:00:00Z"
}
```

## 5. Przepływ danych

1. **Middleware** uwierzytelnia użytkownika i udostępnia `supabase` w `Astro.locals`.
2. **Endpoint** `src/pages/api/sets.ts` (handler `export async function POST(ctx)`):
   - Parsuje `ctx.request.json()`.
   - Waliduje body przez schemat Zod `setCreateCommandSchema`.
3. Handler deleguje do **serwisu** `src/lib/services/sets/createSet.ts`:
   - Przekazuje `userId`, `timezone` oraz dane zestawu i słówek.
4. **Serwis** wykonuje transakcję:
   - a) Wstawia rekord do `sets` (ustawia `user_id`, `name`, `level`, `words_count=0`, `created_at`, `updated_at`).
   - b) Dla każdego słówka wstawia rekord do `words` (auto-generuje `position`, jeśli brak, normalizuje `en` → `en_norm`).
   - c) Aktualizuje `sets.words_count` na rzeczywistą liczbę dodanych słówek.
   - d) Opcjonalnie loguje zdarzenie do `event_log` (`event_type='set_created'`, `entity_id=set_id`).
5. **Serwis** zwraca obiekt `SetSummaryDTO`.
6. **Endpoint** zwraca `201` z JSON.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: wymagany ważny token JWT → 401 jeśli brak/nieprawidłowy.
- **Autoryzacja**: `user_id` ustawiany na `auth.uid()` w Supabase – użytkownik nie może tworzyć zestawów dla innych.
- **Walidacja**:
  - Schemat Zod sprawdza typy, wymagalność, długość pól.
  - `level` musi być jednym z `A1`-`C2`.
  - `words.length` musi być 1-5.
  - `en` nie może być puste ani składać się tylko z białych znaków.
- **Unikalność**: constraint `UNIQUE(user_id, name)` w bazie → jeśli naruszony, zwracamy 409.
- **Normalizacja**: `en_norm` zapobiega duplikatom w różnych zapisach (np. "apple" vs "Apple ").
- **RLS**: Row Level Security w Supabase egzekwuje dostęp tylko do własnych rekordów.

## 7. Obsługa błędów

| Scenariusz | Kod | Treść JSON |
|------------|-----|------------|
| Brak/nieprawidłowy token | 401 | `{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid access token." } }` |
| Brak wymaganych pól (name, level, words) | 400 | `{ "error": { "code": "MISSING_FIELDS", "message": "Required fields missing: ..." } }` |
| Niepoprawny `level` (nie enum) | 400 | `{ "error": { "code": "INVALID_CEFR_LEVEL", "message": "level must be one of A1, A2, B1, B2, C1, C2." } }` |
| Więcej niż 5 słówek | 422 | `{ "error": { "code": "TOO_MANY_WORDS", "message": "Maximum 5 words allowed per set." } }` |
| Tablica `words` pusta | 422 | `{ "error": { "code": "NO_WORDS", "message": "At least one word is required." } }` |
| Duplikat nazwy | 409 | `{ "error": { "code": "DUPLICATE_NAME", "message": "Set with this name already exists." } }` |
| Duplikat angielskiego słowa w zestawie (en_norm) | 422 | `{ "error": { "code": "DUPLICATE_ENGLISH_WORD", "message": "English word 'apple' is duplicated in this set." } }` |
| Błąd bazy danych / transakcji | 500 | `{ "error": { "code": "SERVER_ERROR", "message": "Failed to create set." } }` |

**Uwaga**: Duplikaty angielskich słów są wykrywane przez constraint `UNIQUE(user_id, set_id, en_norm)`. Serwis powinien złapać błąd Postgres i zwrócić 422.

## 8. Rozważania dotyczące wydajności

- **Transakcje**: Używamy transakcji Supabase, aby zapewnić atomowość (set + words w jednym batch).
- **Indeksy**: `UNIQUE(user_id, name)` wspiera szybkie sprawdzenie duplikatów.
- **Batch insert**: Wstawiamy wszystkie słówka jednym zapytaniem (array insert).
- **Normalizacja w bazie**: `en_norm` obliczana przez funkcję `normalize_en()` w Postgres → nie wymaga dodatkowej logiki w API.
- **Limit rozmiaru**: maks. 5 słówek → payload niewielki, nie wymaga streamingu.

## 9. Etapy wdrożenia

1. **Schemat walidacji**
   - `src/lib/schemas/sets.ts` → `setCreateCommandSchema` (Zod).
   - Walidacja `words` jako tablica `wordCreateInputSchema`.
2. **Serwis**
   - `src/lib/services/sets/createSet.ts`:
     - Przyjmuje `userId`, `timezone`, `SetCreateCommand`.
     - Otwiera transakcję Supabase.
     - Wstawia do `sets` i `words`.
     - Zwraca `SetSummaryDTO`.
3. **Endpoint**
   - `src/pages/api/sets.ts` → `export async function POST`.
   - Parsuje body, waliduje, deleguje do serwisu.
   - Zwraca `201` + JSON.
4. **Obsługa błędów**
   - Łapanie błędów Postgres (unique violations → 409, 422).
   - Mapowanie na `ApiErrorDTO`.
5. **Testy jednostkowe**
   - Mock Supabase client.
   - Scenariusze: sukces, duplikat nazwy, za dużo słówek, duplikat en_norm.
6. **Testy integracyjne**
   - Testowanie rzeczywistych zapytań do bazy testowej.
   - Sprawdzanie RLS.
7. **Dokumentacja**
   - Przykłady w `.ai/api-plan.md`.
   - Komentarze w kodzie.
8. **Code review & linting**.
9. **Deploy** → staging, smoke tests.
10. **Monitorowanie** → logi błędów, metryki utworzonych zestawów.

