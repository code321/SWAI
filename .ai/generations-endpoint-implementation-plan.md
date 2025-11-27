# API Endpoint Implementation Plan: POST /api/sets/{setId}/generate

## 1. Przegląd punktu końcowego
Endpoint umożliwia utworzenie *generation run* – procesu generowania zdań przykładowych dla każdego słowa w wybranym zbiorze (set). Obsługuje limit dzienny (≤ 10 na użytkownika), idempotencję oraz zwraca szczegółowe statystyki wykorzystania tokenów i kosztów. Może działać synchronicznie (bezpośredni zwrot zdań) lub asynchronicznie (kolejka z kodem 202).

## 2. Szczegóły żądania
* **Metoda HTTP**: `POST`
* **URL**: `/api/sets/{setId}/generate`
* **Parametry**
  * Path ‑ **setId** *(UUID, required)*
* **Nagłówki**
  * `X-Idempotency-Key` *(string, required)* – unikalny dla danego `user_id` + dzień; używany przy UNIQUE(user_id,idempotency_key).
  * `X-Request-Id` *(string, optional)* – propagowany do logów.
* **Body (JSON)** — zgodny z `SetGenerationCommand`
```json
{
  "model_id": "openai/gpt-4o-mini",   // string, required
  "temperature": 0.8,                  // number 0-2, required
  "prompt_version": "v1.0.3"          // string, required
}
```

## 3. Wykorzystywane typy
* **Input**: `SetGenerationCommand` (src/types.ts)
* **Output**:
  * **Synchronous**: `GenerationResponseDTO` (pełne dane)
  * **Asynchronous**: `MessageResponse<\"GENERATION_STARTED\">`
* **Błędy**: `ApiErrorDTO`

## 4. Szczegóły odpowiedzi
| Status | Scenariusz | Body |
|--------|------------|------|
| **200 OK** | Generacja ukończona synchronicznie | `GenerationResponseDTO` |
| **202 Accepted** | Generacja umieszczona w kolejce | `{ "message": "GENERATION_STARTED" }` |
| **400 Bad Request** | Błąd walidacji Zod | `ApiErrorDTO` |
| **401 Unauthorized** | Brak/niepoprawna sesja | `ApiErrorDTO` |
| **403 Forbidden** | Limit dzienny osiągnięty | `ApiErrorDTO` |
| **404 Not Found** | Zbiór nie istnieje lub nie należy do użytkownika | `ApiErrorDTO` |
| **409 Conflict** | Powtórzone `X-Idempotency-Key` | `ApiErrorDTO` |
| **422 Unprocessable Entity** | Zbiór nie posiada słów | `ApiErrorDTO` |
| **429 Too Many Requests** | Rate-limiter / burst-protection | `ApiErrorDTO` |
| **502 Bad Gateway** | Błąd usługi LLM | `ApiErrorDTO` |
| **500 Internal Server Error** | Inne nieobsłużone | `ApiErrorDTO` |

## 5. Przepływ danych
1. **Middleware**
   * Autoryzacja: z `locals.supabase` pobieramy `user` → 401 gdy brak.
   * Rate-Limiter (globalny) → 429.
2. **Zod validation** nagłówków + body + UUID z parametrów.
3. **Service layer** (`src/lib/services/generation/triggerGeneration.ts`):
   1. Pobierz set i sprawdź ownership (404).
   2. Sprawdź licznik generation_runs dla usera na dzień (403).
   3. Sprawdź idempotency_key → jeśli istnieje, zwróć poprzedni `GenerationResponseDTO` (409 lub 200 w zależności od policy).
   4. Zweryfikuj, że set zawiera słowa (422).
   5. Utwórz rekord `generation_runs` (DB transaction).  
      * `words_snapshot` = array słów `{pl,en}` w momencie generacji.
   6. Wywołaj OpenRouter AI → jeśli async: wstaw zadanie do kolejki i zwróć 202.  
      jeśli sync: zapisz wygenerowane `sentences`; uaktualnij pola tokens/cost; zwróć 200 + payload.
   7. Commit transakcji.
4. **Event logging**:  
   * sukces: INSERT do `event_log` (`generation_run_created`).  
   * błąd: INSERT do `event_log` / `error_log` z kodem i stackiem.

## 6. Względy bezpieczeństwa
* **Auth**: Sesja z Supabase (cookie `sb:token`) → weryfikacja na podstawie `supabase.auth.getUser()`.
* **Ownership**: `sets.user_id === session.user.id`.
* **Idempotency**: unikalny klucz + transakcja SERIALIZABLE lub `insert … on conflict do nothing`.
* **Daily limit**: `COUNT(*)` na `generation_runs` z `occurred_at >= date_trunc('day', now())`.
* **Prompt safety**: przy budowie promtu escape/strip znaków kontrolnych.
* **Cost abuse**: twardy limit tokenów na generation (np. ≤ 3000).

## 7. Obsługa błędów
* Błędy walidacji → 400 (Zod) z listą pól.
* Konflikty (duplicate key) → 409.
* LLM timeouts / non-200 → mapuj na 502, loguj z retry flag.
* Database exceptions → rollback & 500.
* Wszystkie błędy logowane w `event_log` (`event_type='error'`).

## 8. Rozważania dotyczące wydajności
* **Batch insert** zdań (COPY lub `insert … select unnest()`) aby uniknąć N zapisań.
* **Parallel streaming** OpenRouter jeśli model wspiera.
* **SELECT słów** ograniczony tylko do `pl,en` by nie przenosić zbędnych kolumn.
* **DB indexy**: `generation_runs (user_id, occurred_at)` dla limitu dziennego.

## 9. Etapy wdrożenia
1. **DB**: upewnij się, że migracje dla `generation_runs` i `sentences` są wdrożone.
2. **Zod schemas**: `src/lib/schemas/generation.ts` – HeaderSchema, BodySchema.
3. **Service**: zaimplementuj `triggerGeneration.ts` + jednostkowe testy logiki limitów.
4. **API route**: `src/pages/api/sets/[setId]/generate.ts` – handler POST.
5. **Middleware**: rozszerz globalne rate-limiter & propagację `X-Request-Id`.
6. **Queue (optional)**: jeśli async, dodać adapter do Supabase Realtime functions lub `jobs` table.
