# API Endpoint Implementation Plan: GET /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint zwraca szczegóły pojedynczego zestawu słówek, w tym pełną listę słów posortowanych według `position` oraz informacje o ostatniej generacji (jeśli istnieje).

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **URL**: `/api/sets/{setId}`
- **Parametry URL**:
  - **Wymagane**:
    | Parametr | Typ | Opis |
    |----------|-----|------|
    | `setId` | `UUID` | Identyfikator zestawu. |
- **Query params**: brak
- **Body**: brak

**Przykład URL**: `/api/sets/6f9c2e9a-1234-5678-90ab-cdef12345678`

## 3. Wykorzystywane typy

| Nazwa | Plik | Rola |
|-------|------|------|
| `SetDetailDTO` | `src/types.ts` | Odpowiedź HTTP ze szczegółami zestawu. |
| `WordDTO` | `src/types.ts` | Pojedyncze słówko w zestawie. |
| `GenerationRunMetaDTO` | `src/types.ts` | Metadane ostatniej generacji. |
| `Tables<'sets'>` | `src/db/database.types.ts` | Typ wiersza tabeli `sets`. |
| `Tables<'words'>` | `src/db/database.types.ts` | Typ wiersza tabeli `words`. |
| `Tables<'generation_runs'>` | `src/db/database.types.ts` | Typ wiersza tabeli `generation_runs`. |

## 4. Szczegóły odpowiedzi

- **Status sukcesu**: `200 OK`
- **Nagłówek**: `Content-Type: application/json; charset=utf-8`
- **Body**: `SetDetailDTO`
```json
{
  "id": "uuid",
  "name": "Food Basics",
  "level": "A2",
  "words_count": 2,
  "created_at": "2025-11-14T10:00:00Z",
  "updated_at": "2025-11-14T10:00:00Z",
  "user_id": "uuid",
  "words": [
    { "id": "uuid", "pl": "jabłko", "en": "apple", "position": 1 },
    { "id": "uuid", "pl": "chleb", "en": "bread", "position": 2 }
  ],
  "latest_generation": {
    "id": "uuid",
    "occurred_at": "2025-11-14T11:00:00Z"
  }
}
```

## 5. Przepływ danych

1. **Middleware** uwierzytelnia użytkownika i udostępnia `supabase` w `Astro.locals`.
2. **Endpoint** `src/pages/api/sets/[setId].ts` (handler `export async function GET(ctx)`):
   - Pobiera `setId` z `ctx.params.setId`.
   - Waliduje czy jest poprawnym UUID (Zod).
3. Handler deleguje do **serwisu** `src/lib/services/sets/getSetById.ts`:
   - Przekazuje `userId` i `setId`.
4. **Serwis** wykonuje zapytania:
   - a) Pobiera rekord z `sets` WHERE `id = setId` AND `user_id = userId`.
   - b) Jeśli brak → zwraca `null`.
   - c) Pobiera wszystkie `words` WHERE `set_id = setId` ORDER BY `position ASC`.
   - d) Pobiera najnowszą `generation_run` WHERE `set_id = setId` ORDER BY `occurred_at DESC` LIMIT 1.
5. **Serwis** mapuje dane na `SetDetailDTO` i zwraca.
6. **Endpoint**:
   - Jeśli serwis zwrócił `null` → 404.
   - W przeciwnym razie → 200 + JSON.

**Optymalizacja**: Można użyć jednego zapytania z `LEFT JOIN` na `words` i `generation_runs`, ale dla czytelności zalecam oddzielne zapytania (Supabase Query Builder obsługuje `select` z relacjami).

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: wymagany ważny token JWT → 401 jeśli brak/nieprawidłowy.
- **Autoryzacja**: zapytanie zawiera filtr `user_id = userId` → użytkownik nie może zobaczyć zestawu innego użytkownika.
- **Walidacja UUID**: `setId` musi być poprawnym UUID → 400 jeśli nie.
- **RLS**: Row Level Security w Supabase egzekwuje dostęp tylko do własnych rekordów.

## 7. Obsługa błędów

| Scenariusz | Kod | Treść JSON |
|------------|-----|------------|
| Brak/nieprawidłowy token | 401 | `{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid access token." } }` |
| `setId` nie jest UUID | 400 | `{ "error": { "code": "INVALID_SET_ID", "message": "setId must be a valid UUID." } }` |
| Zestaw nie istnieje lub nie należy do użytkownika | 404 | `{ "error": { "code": "SET_NOT_FOUND", "message": "Set not found." } }` |
| Błąd bazy danych | 500 | `{ "error": { "code": "SERVER_ERROR", "message": "Failed to fetch set details." } }` |

## 8. Rozważania dotyczące wydajności

- **Indeksy**: `PRIMARY KEY (id)` na `sets` + `idx_words_position` na `words` wspierają szybkie zapytania.
- **Selektywne kolumny**: Wybieramy tylko kolumny wymagane przez `SetDetailDTO` i `WordDTO`.
- **JOIN vs multiple queries**: 
  - Dla prostoty: 3 zapytania (set, words, latest_generation).
  - Dla wydajności: 1 zapytanie z JOIN (optymalizacja w przyszłości).
- **Caching**: Można cache'ować wynik na 10-30s (set details zmieniają się rzadko).
- **N+1 problem**: Nie występuje, ponieważ pobieramy wszystkie words jednym zapytaniem.

## 9. Etapy wdrożenia

1. **Schemat walidacji**
   - `src/lib/schemas/sets.ts` → `setIdParamSchema` (Zod UUID).
2. **Serwis**
   - `src/lib/services/sets/getSetById.ts`:
     - Przyjmuje `userId`, `setId`.
     - Wykonuje zapytania do Supabase.
     - Zwraca `SetDetailDTO | null`.
3. **Endpoint**
   - `src/pages/api/sets/[setId].ts` → `export async function GET`.
   - Parsuje `setId`, waliduje, deleguje do serwisu.
   - Zwraca `200` + JSON lub `404`.
4. **Dynamic routing w Astro**
   - Plik `src/pages/api/sets/[setId].ts` obsługuje dynamiczny parametr.
   - `export const prerender = false` dla SSR.
5. **Obsługa błędów**
   - Mapowanie na `ApiErrorDTO`.
6. **Testy jednostkowe**
   - Mock Supabase client.
   - Scenariusze: sukces, 404, invalid UUID.
7. **Testy integracyjne**
   - Testowanie z rzeczywistą bazą testową.
   - Sprawdzanie RLS.
8. **Dokumentacja**
   - Przykłady w `.ai/api-plan.md`.
9. **Code review & linting**.
10. **Deploy** → staging, smoke tests.

