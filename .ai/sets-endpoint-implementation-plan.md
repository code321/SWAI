# API Endpoint Implementation Plan: GET /api/sets

## 1. Przegląd punktu końcowego

Punkt końcowy "List Sets" zwraca listę kolekcji słówek (sets) należących do zalogowanego użytkownika. Pozwala filtrować po prefiksie nazwy, poziomie CEFR, sortować oraz paginować wyniki.

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **URL**: `/api/sets`
- **Parametry zapytania**:
  - **Wymagane**: brak (wszystkie parametry są opcjonalne)
  - **Opcjonalne**:
    | Parametr | Typ | Domyślnie | Opis |
    |----------|-----|-----------|------|
    | `search` | `string` | – | Prefiks nazwy zestawu (używa indeksu `idx_sets_name_prefix`). |
    | `level`  | `CEFRLevel` (enum) | – | Filtruje po poziomie CEFRLevel A1-C2. |
    | `cursor` | `string` | – | Kursor w formacie `timestamp|uuid` wskazujący miejsce kontynuacji. |
    | `limit`  | `number` | `10` | Ilość rekordów (max = 50). |
    | `sort`   | `'created_at_desc' \| 'name_asc'` | `created_at_desc` | Sposób sortowania. |

## 3. Wykorzystywane typy

| Nazwa | Plik | Rola |
|-------|------|------|
| `SetsListQuery` | `src/types.ts` | Typ zapytania przyjmowany przez warstwę serwisu. |
| `SetSummaryDTO` | `src/types.ts` | Pojedynczy element listy. |
| `SetsListResponseDTO` | `src/types.ts` | Pełna odpowiedź HTTP. |
| `PaginationMeta` / `PaginatedResponse` | `src/types.ts` | Metadane paginacji. |

## 4. Szczegóły odpowiedzi

- **Status sukcesu**: `200 OK`
- **Nagłówek**: `Content-Type: application/json; charset=utf-8`
- **Body**: `SetsListResponseDTO`
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
    "pagination": {
      "next_cursor": "timestamp|uuid",
      "count": 10
    }
  }
  ```

## 5. Przepływ danych

1. **Middleware** `src/middleware/index.ts` uwierzytelnia żądanie i udostępnia `supabase` w `Astro.locals`.
2. **Endpoint** `src/pages/api/sets.ts` (handler `export async function GET(ctx)`) parsuje parametry i waliduje je z pomocą schematów Zod.
3. Handler deleguje do **serwisu** `src/lib/services/sets/listSets.ts` przekazując `userId` oraz `SetsListQuery`.
4. Serwis buduje zapytanie Supabase:
   - Filtr `eq('user_id', userId)`.
   - Jeśli `search` → `ilike('name', search + '%')`.
   - Jeśli `level` → `eq('level', level)`.
   - Sortowanie wg `created_at` lub `name`.
   - Cursor-based pagination: `gt('created_at', ts)` + `gt('id', uuid)` lub `range(0, limit-1)`.
   - Limit `limit`.
5. Serwis zwraca dane w kształcie `SetSummaryDTO[]` oraz `PaginationMeta`.
6. Endpoint mapuje wynik na `SetsListResponseDTO` i zwraca JSON.

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: wymagany ważny token Supabase JWT → 401 w przeciwnym razie.
- **Autoryzacja**: zapytanie ograniczone do `user_id` bieżącego użytkownika.
- **Walidacja**: Zod uniemożliwia wstrzyknięcie niepoprawnych typów / wartości (np. spoza enum, nadmierny `limit`).
- **Dane**: korzystamy z parametryzowanych zapytań Supabase – brak SQL-Injection.

## 7. Obsługa błędów

| Scenariusz | Kod | Treść JSON |
|------------|-----|------------|
| Brak/nieprawidłowy token | 401 | `{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid access token." } }` |
| Niepoprawne parametry (schemat Zod) | 400 | `{ "error": { "code": "INVALID_QUERY", "message": "…" } }` |
| Niepoprawny `level` (CEFRLevel) lub `sort` | 422 | `{ "error": { "code": "INVALID_FILTER", "message": "…" } }` |
| Błąd serwera/Supabase | 500 | `{ "error": { "code": "SERVER_ERROR", "message": "Unexpected server error." } }` |

*Błędy można logować do `event_log` z `event_type = 'api_error'` i `entity_id = user_id`.*

## 8. Rozważania dotyczące wydajności

- **Indeksowanie**: `idx_sets_name_prefix` dla wyszukiwania `search` oraz indeks na `created_at`.
- **Limit**: maks. 50 rekordów → unika dużych payloadów.
- **Selektywne kolumny**: wybieramy tylko kolumny wymagane przez `SetSummaryDTO`.
- **Stronicowanie**: cursor-based zamiast offset.
- **Edge caching**: można dodać krótkie (5-10 s) cache-control dla identycznych zapytań.

## 9. Etapy wdrożenia

1. **Schemat walidacji**
   - `src/lib/schemas/sets.ts` → `listSetsQuerySchema` (Zod).
2. **Serwis**
   - Utwórz `src/lib/services/sets/listSets.ts` implementujący zapytanie.
3. **Endpoint**
   - `src/pages/api/sets.ts` → obsłuż metodę `GET`.
4. **Typy**
   - Eksportuj `SetsListQuery` z `src/types.ts` (już istnieje).
5. **Testy jednostkowe** serwisu (mock Supabase).
6. **Testy integracyjne** endpointu (Supertest + skrypty seed).
7. **Aktualizacja dokumentacji** (`.ai/api-plan.md` – sekcja success examples, error cases).
8. **Code review & lint** → upewnij się, że przechodzi `eslint` i `tsc`.
9. **Deploy** → środowisko staging, smoke tests.
10. **Monitorowanie** → dashboard Supabase, logi błędów.
