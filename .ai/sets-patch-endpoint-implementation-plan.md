# API Endpoint Implementation Plan: PATCH /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint aktualizuje metadane zestawu (`name`, `level`) oraz opcjonalnie zastępuje kolekcję słówek. Egzekwuje limit maksymalnie 5 słówek oraz unikalność nazwy i angielskich słów.

## 2. Szczegóły żądania

- **Metoda HTTP**: `PATCH`
- **URL**: `/api/sets/{setId}`
- **Content-Type**: `application/json`
- **Parametry URL**:
  - **Wymagane**:
    | Parametr | Typ | Opis |
    |----------|-----|------|
    | `setId` | `UUID` | Identyfikator zestawu. |

- **Parametry body** (wszystkie opcjonalne):
  | Pole | Typ | Opis |
  |------|-----|------|
  | `name` | `string` | Nowa nazwa zestawu (unikalna na użytkownika). |
  | `level` | `CEFRLevel` | Nowy poziom językowy (A1-C2). |
  | `words` | `WordUpsertInput[]` | Nowa kolekcja słówek (1-5). |

- **Struktura `WordUpsertInput`**:
  | Pole | Typ | Wymagane | Opis |
  |------|-----|----------|------|
  | `id` | `UUID` | Nie | Jeśli podane → update istniejącego słowa. Jeśli brak → insert nowego. |
  | `pl` | `string` | Tak | Polskie słowo/wyrażenie. |
  | `en` | `string` | Tak | Angielskie tłumaczenie. |
  | `position` | `number` | Nie | Pozycja (1-5). Jeśli brak, auto-przypisywana. |

**Przykład body** (update nazwy i słówek):
```json
{
  "name": "Food Advanced",
  "level": "B1",
  "words": [
    { "id": "uuid-1", "pl": "jabłko", "en": "apple" },
    { "pl": "warzywo", "en": "vegetable" }
  ]
}
```

## 3. Wykorzystywane typy

| Nazwa | Plik | Rola |
|-------|------|------|
| `SetUpdateCommand` | `src/types.ts` | Typ body żądania. |
| `WordUpsertInput` | `src/types.ts` | Typ pojedynczego słówka (update lub insert). |
| `SetUpdateResponseDTO` (= `SetDetailDTO`) | `src/types.ts` | Odpowiedź HTTP. |
| `TablesUpdate<'sets'>` | `src/db/database.types.ts` | Typ update dla tabeli `sets`. |
| `TablesUpdate<'words'>` | `src/db/database.types.ts` | Typ update dla tabeli `words`. |

## 4. Szczegóły odpowiedzi

- **Status sukcesu**: `200 OK`
- **Nagłówek**: `Content-Type: application/json; charset=utf-8`
- **Body**: `SetUpdateResponseDTO` (= `SetDetailDTO`)
```json
{
  "id": "uuid",
  "name": "Food Advanced",
  "level": "B1",
  "words_count": 2,
  "created_at": "2025-11-14T10:00:00Z",
  "updated_at": "2025-11-14T12:00:00Z",
  "user_id": "uuid",
  "words": [
    { "id": "uuid-1", "pl": "jabłko", "en": "apple", "position": 1 },
    { "id": "uuid-2", "pl": "warzywo", "en": "vegetable", "position": 2 }
  ],
  "latest_generation": null
}
```

## 5. Przepływ danych

1. **Middleware** uwierzytelnia użytkownika i udostępnia `supabase` w `Astro.locals`.
2. **Endpoint** `src/pages/api/sets/[setId].ts` (handler `export async function PATCH(ctx)`):
   - Pobiera `setId` z `ctx.params.setId`.
   - Parsuje `ctx.request.json()`.
   - Waliduje `setId` (UUID) i body przez schemat Zod `setUpdateCommandSchema`.
3. Handler deleguje do **serwisu** `src/lib/services/sets/updateSet.ts`:
   - Przekazuje `userId`, `setId`, `SetUpdateCommand`.
4. **Serwis** wykonuje transakcję:
   - a) Sprawdza, czy zestaw istnieje i należy do użytkownika (SELECT WHERE `id = setId` AND `user_id = userId`).
   - b) Jeśli brak → zwraca `null` (404).
   - c) Jeśli `name` lub `level` w body → UPDATE `sets` SET `name`, `level`, `updated_at = now()`.
   - d) Jeśli `words` w body:
     - Pobiera listę istniejących `words` dla `set_id`.
     - Dla każdego `WordUpsertInput`:
       - Jeśli ma `id` → UPDATE istniejącego słowa.
       - Jeśli brak `id` → INSERT nowego słowa.
     - Usuwa słowa, których `id` nie ma w nowej liście (DELETE WHERE `set_id = setId` AND `id NOT IN (...)`).
     - Aktualizuje `sets.words_count`.
   - e) Opcjonalnie loguje zdarzenie do `event_log` (`event_type='set_updated'`).
5. **Serwis** pobiera zaktualizowany zestaw (wywołuje `getSetById`) i zwraca `SetDetailDTO`.
6. **Endpoint** zwraca `200` + JSON.

**Uwaga**: Logika usuwania słówek może być uproszczona – jeśli `words` jest podane, usuwamy wszystkie stare słówka i wstawiamy nowe (replace strategy).

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: wymagany ważny token JWT → 401 jeśli brak/nieprawidłowy.
- **Autoryzacja**: zapytanie zawiera filtr `user_id = userId` → użytkownik nie może edytować zestawu innego użytkownika.
- **Walidacja**:
  - `setId` musi być UUID.
  - Jeśli `level` → musi być jednym z `A1`-`C2`.
  - Jeśli `words` → długość 1-5.
  - Duplikaty `en_norm` w nowej liście → 422.
- **Unikalność nazwy**: constraint `UNIQUE(user_id, name)` → jeśli naruszony → 409.
- **RLS**: Row Level Security egzekwuje dostęp tylko do własnych rekordów.
- **Cascading deletes**: Usunięcie słówek kaskadowo usuwa powiązane `sentences` (jeśli były generacje).

## 7. Obsługa błędów

| Scenariusz | Kod | Treść JSON |
|------------|-----|------------|
| Brak/nieprawidłowy token | 401 | `{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid access token." } }` |
| `setId` nie jest UUID | 400 | `{ "error": { "code": "INVALID_SET_ID", "message": "setId must be a valid UUID." } }` |
| Body JSON niepoprawny | 400 | `{ "error": { "code": "INVALID_PAYLOAD", "message": "Invalid JSON body." } }` |
| Zestaw nie istnieje lub nie należy do użytkownika | 404 | `{ "error": { "code": "SET_NOT_FOUND", "message": "Set not found." } }` |
| Niepoprawny `level` | 400 | `{ "error": { "code": "INVALID_CEFR_LEVEL", "message": "level must be one of A1, A2, B1, B2, C1, C2." } }` |
| Duplikat nazwy | 409 | `{ "error": { "code": "DUPLICATE_NAME", "message": "Set with this name already exists." } }` |
| Więcej niż 5 słówek | 422 | `{ "error": { "code": "TOO_MANY_WORDS", "message": "Maximum 5 words allowed per set." } }` |
| Duplikat angielskiego słowa (en_norm) | 422 | `{ "error": { "code": "DUPLICATE_ENGLISH_WORD", "message": "English word 'apple' is duplicated in this set." } }` |
| Aktywna sesja uniemożliwia update | 409 | `{ "error": { "code": "ACTIVE_SESSION", "message": "Cannot update set with active exercise session." } }` |
| Błąd bazy danych | 500 | `{ "error": { "code": "SERVER_ERROR", "message": "Failed to update set." } }` |

**Uwaga**: Guard `ACTIVE_SESSION` jest biznesowy – jeśli istnieje sesja WHERE `set_id = setId` AND `finished_at IS NULL`, blokujemy update słówek (ale pozwalamy na zmianę `name`/`level`).

## 8. Rozważania dotyczące wydajności

- **Transakcje**: Używamy transakcji Supabase dla atomowości (set + words update/delete/insert).
- **Batch operations**: Usuwanie/wstawianie słówek jednym zapytaniem (array operations).
- **Indeksy**: `UNIQUE(user_id, name)`, `UNIQUE(user_id, set_id, en_norm)` wspierają szybkie sprawdzenie duplikatów.
- **Optimistic locking**: Można dodać `version` lub `updated_at` w WHERE clause, aby wykryć konflikty concurrent updates.
- **Limit rozmiaru**: maks. 5 słówek → payload niewielki.

## 9. Etapy wdrożenia

1. **Schemat walidacji**
   - `src/lib/schemas/sets.ts` → `setUpdateCommandSchema` (Zod).
   - Walidacja `words` jako opcjonalna tablica `wordUpsertInputSchema`.
2. **Serwis**
   - `src/lib/services/sets/updateSet.ts`:
     - Przyjmuje `userId`, `setId`, `SetUpdateCommand`.
     - Sprawdza istnienie zestawu.
     - Otwiera transakcję.
     - Aktualizuje `sets` i `words`.
     - Zwraca `SetDetailDTO | null`.
3. **Guard dla aktywnej sesji**
   - `src/lib/services/sets/checkActiveSession.ts`:
     - Sprawdza czy istnieje sesja WHERE `set_id = setId` AND `finished_at IS NULL`.
     - Jeśli tak → zwraca `true`.
   - Wywołanie w serwisie przed update słówek.
4. **Endpoint**
   - `src/pages/api/sets/[setId].ts` → `export async function PATCH`.
   - Parsuje `setId` i body, waliduje, deleguje do serwisu.
   - Zwraca `200` + JSON lub `404`/`409`.
5. **Obsługa błędów**
   - Łapanie błędów Postgres (unique violations → 409, 422).
   - Mapowanie na `ApiErrorDTO`.
6. **Testy jednostkowe**
   - Mock Supabase client.
   - Scenariusze: sukces, 404, duplikat nazwy, za dużo słówek, duplikat en_norm, aktywna sesja.
7. **Testy integracyjne**
   - Testowanie z rzeczywistą bazą testową.
   - Sprawdzanie RLS i cascading deletes.
8. **Dokumentacja**
   - Przykłady w `.ai/api-plan.md`.
9. **Code review & linting**.
10. **Deploy** → staging, smoke tests.

