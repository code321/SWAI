# API Endpoint Implementation Plan: DELETE /api/sets/{setId}

## 1. Przegląd punktu końcowego

Endpoint trwale usuwa zestaw słówek wraz z powiązanymi danymi (słówka, generacje, sesje, próby) poprzez kaskadowe usuwanie. Przed usunięciem sprawdza, czy nie istnieje aktywna sesja ćwiczeń.

## 2. Szczegóły żądania

- **Metoda HTTP**: `DELETE`
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
| `SetDeleteResponseDTO` | `src/types.ts` | Odpowiedź HTTP (message). |
| `MessageResponse<'SET_DELETED'>` | `src/types.ts` | Typ bazowy dla message response. |

## 4. Szczegóły odpowiedzi

- **Status sukcesu**: `204 No Content`
- **Nagłówek**: brak body (alternatywnie `200 OK` z JSON message)
- **Body** (opcjonalnie dla `200`):
```json
{
  "message": "SET_DELETED"
}
```

**Uwaga**: Spec API mówi `204 No Content`, ale można też zwrócić `200 OK` z JSON message dla spójności z innymi endpointami.

## 5. Przepływ danych

1. **Middleware** uwierzytelnia użytkownika i udostępnia `supabase` w `Astro.locals`.
2. **Endpoint** `src/pages/api/sets/[setId].ts` (handler `export async function DELETE(ctx)`):
   - Pobiera `setId` z `ctx.params.setId`.
   - Waliduje czy jest poprawnym UUID (Zod).
3. Handler deleguje do **serwisu** `src/lib/services/sets/deleteSet.ts`:
   - Przekazuje `userId` i `setId`.
4. **Serwis** wykonuje:
   - a) Sprawdza, czy zestaw istnieje i należy do użytkownika (SELECT WHERE `id = setId` AND `user_id = userId`).
   - b) Jeśli brak → zwraca `{ success: false, error: 'NOT_FOUND' }`.
   - c) Sprawdza, czy istnieje aktywna sesja ćwiczeń (SELECT FROM `exercise_sessions` WHERE `set_id = setId` AND `finished_at IS NULL`).
   - d) Jeśli istnieje → zwraca `{ success: false, error: 'ACTIVE_SESSION' }`.
   - e) Usuwa zestaw: DELETE FROM `sets` WHERE `id = setId` AND `user_id = userId`.
   - f) Kaskadowe usunięcie (automatyczne przez `ON DELETE CASCADE`):
     - `words` → usunięte.
     - `generation_runs` → usunięte.
     - `sentences` → usunięte.
     - `exercise_sessions` → usunięte.
     - `attempts` → usunięte.
     - `ratings` → usunięte.
   - g) Opcjonalnie loguje zdarzenie do `event_log` (`event_type='set_deleted'`, `entity_id=setId`).
5. **Serwis** zwraca `{ success: true }`.
6. **Endpoint** zwraca `204 No Content` (lub `200 OK` z JSON message).

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: wymagany ważny token JWT → 401 jeśli brak/nieprawidłowy.
- **Autoryzacja**: zapytanie zawiera filtr `user_id = userId` → użytkownik nie może usunąć zestawu innego użytkownika.
- **Walidacja UUID**: `setId` musi być poprawnym UUID → 400 jeśli nie.
- **Business guard**: Aktywna sesja blokuje usunięcie → 409.
- **RLS**: Row Level Security egzekwuje dostęp tylko do własnych rekordów.
- **Audit log**: Zdarzenie usunięcia zapisywane w `event_log` (opcjonalnie przed usunięciem, aby zachować `entity_id`).

## 7. Obsługa błędów

| Scenariusz | Kod | Treść JSON |
|------------|-----|------------|
| Brak/nieprawidłowy token | 401 | `{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid access token." } }` |
| `setId` nie jest UUID | 400 | `{ "error": { "code": "INVALID_SET_ID", "message": "setId must be a valid UUID." } }` |
| Zestaw nie istnieje lub nie należy do użytkownika | 404 | `{ "error": { "code": "SET_NOT_FOUND", "message": "Set not found." } }` |
| Aktywna sesja uniemożliwia usunięcie | 409 | `{ "error": { "code": "ACTIVE_SESSION", "message": "Cannot delete set with active exercise session. Please finish the session first." } }` |
| Błąd bazy danych | 500 | `{ "error": { "code": "SERVER_ERROR", "message": "Failed to delete set." } }` |

## 8. Rozważania dotyczące wydajności

- **Kaskadowe usuwanie**: `ON DELETE CASCADE` w Postgres automatycznie usuwa powiązane rekordy → nie wymaga dodatkowych zapytań w kodzie.
- **Transakcje**: Operacja DELETE jest atomowa.
- **Indeksy**: `PRIMARY KEY (id)` na `sets` + indeksy foreign key wspierają szybkie usuwanie.
- **Soft delete vs hard delete**: Spec wymaga hard delete. W przyszłości można rozważyć soft delete (kolumna `deleted_at`) dla audytu.
- **Blokady**: Postgres używa row-level locks podczas DELETE → nie ma konfliktu z innymi operacjami na tym samym zestawie.

## 9. Etapy wdrożenia

1. **Schemat walidacji**
   - `src/lib/schemas/sets.ts` → `setIdParamSchema` (Zod UUID) – już istnieje z GET endpoint.
2. **Guard dla aktywnej sesji**
   - `src/lib/services/sets/checkActiveSession.ts`:
     - Sprawdza czy istnieje sesja WHERE `set_id = setId` AND `finished_at IS NULL`.
     - Zwraca `boolean`.
3. **Serwis**
   - `src/lib/services/sets/deleteSet.ts`:
     - Przyjmuje `userId`, `setId`.
     - Sprawdza istnienie zestawu.
     - Sprawdza aktywną sesję (wywołuje guard).
     - Jeśli guard zwraca `true` → zwraca błąd.
     - Usuwa zestaw: `DELETE FROM sets WHERE id = setId AND user_id = userId`.
     - Zwraca `{ success: true } | { success: false, error: string }`.
4. **Audit log** (opcjonalnie)
   - Przed usunięciem loguje zdarzenie do `event_log`:
     - `event_type = 'set_deleted'`
     - `entity_id = setId`
     - `user_id = userId`
     - `occurred_at = now()`
5. **Endpoint**
   - `src/pages/api/sets/[setId].ts` → `export async function DELETE`.
   - Parsuje `setId`, waliduje, deleguje do serwisu.
   - Jeśli `success: false` → mapuje błąd na odpowiedni kod HTTP (404, 409).
   - Jeśli `success: true` → zwraca `204 No Content`.
6. **Obsługa błędów**
   - Mapowanie na `ApiErrorDTO`.
7. **Testy jednostkowe**
   - Mock Supabase client.
   - Scenariusze: sukces, 404, aktywna sesja → 409.
8. **Testy integracyjne**
   - Testowanie z rzeczywistą bazą testową.
   - Sprawdzanie kaskadowego usuwania (czy `words`, `generation_runs`, etc. są usunięte).
   - Sprawdzanie RLS.
9. **Dokumentacja**
   - Przykłady w `.ai/api-plan.md`.
10. **Code review & linting**.
11. **Deploy** → staging, smoke tests.
12. **Monitorowanie** → logi usunięć, metryki retention użytkowników.

