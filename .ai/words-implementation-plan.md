# API Endpoint Implementation Plan: POST /api/sets/{setId}/words

## 1. Przegląd punktu końcowego

Endpoint umożliwia dodanie jednego lub wielu słów do istniejącego zestawu użytkownika. Po pomyślnym utworzeniu zwracana jest lista dodanych słów oraz zaktualizowana liczba słów w zestawie.

## 2. Szczegóły żądania

- **Metoda HTTP**: `POST`
- **URL**: `/api/sets/{setId}/words`
- **Parametry ścieżki**:
  - `setId` *(uuid, wymagany)* – identyfikator zestawu.
- **Body (JSON)** – zgodne z `WordsAddCommand`:

```json
{
  "words": [
    { "pl": "samolot", "en": "plane" },
    { "pl": "lotnisko", "en": "airport", "position": 3 }
  ]
}
```

### Walidacja wejścia
| Kryterium | Reguła |
|-----------|-------|
| `words`   | Tablica 1-5 elementów |
| `pl`      | `string` niepusta |
| `en`      | `string` niepusta |
| `position`| `int` 1-5 (opcjonalnie) |
| Duplikaty | Brak duplikatów `en`/`position` w payloadzie |

## 3. Wykorzystywane typy

- **Command**: `WordsAddCommand`
- **DTOs**: `WordDTO`, `WordsAddResponseDTO`, `ApiErrorDTO`

## 4. Szczegóły odpowiedzi

| Kod | Scenariusz | Body |
|-----|------------|------|
| 201 | Słowa dodane | `WordsAddResponseDTO` |
| 400 | Nieprawidłowe dane (Zod) | `ApiErrorDTO` |
| 401 | Brak autoryzacji | `ApiErrorDTO` |
| 404 | Zestaw nie istnieje / nie należy do użytkownika | `ApiErrorDTO` |
| 409 | Konflikt: duplikat `en`/`position` | `ApiErrorDTO` |
| 422 | >5 słów lub pozycja poza zakresem | `ApiErrorDTO` |
| 500 | Błąd serwera | `ApiErrorDTO` |

## 5. Przepływ danych

1. Klient wysyła `POST` ➜ API Route `/api/sets/[setId]/words.ts`.
2. Route:
   - Pobiera `supabase` i `user` z `context.locals`.
   - Parsuje `setId` z URL.
   - Waliduje body przez Zod → `wordsAddSchema`.
   - Wywołuje `addWordsService({ supabase, userId, setId, words })`.
3. `addWordsService`:
   1. W transakcji:
      - Sprawdza istnienie zestawu i przynależność do `userId`.
      - Pobiera aktualne `words_count` i zajęte `position`/`en_norm` (przez `select` z `words`).
      - Wylicza brakujące `position` dla słów bez `position` (kolejne wolne).
      - Tworzy tablicę insertów (`pl`, `en`, `position`, `set_id`, `user_id`).
      - Wykonuje `insert` z opcją `returning`.
      - Aktualizuje `sets.words_count` (+N).
   2. Zwraca `added` i nowe `words_count`.
4. Route zwraca `201 Created` + JSON.

## 6. Względy bezpieczeństwa

- **Autentykacja**: wymóg aktywnej sesji; wyciągamy `user` z `locals`.
- **Autoryzacja**: sprawdzamy, czy `sets.user_id === user.id` (RLS w Supabase + dodatkowa walidacja logiczna).
- **RLS**: reguły Supabase blokują dostęp do obcych setów; transakcja wykonuje się z context‐level RLS.
- **Input sanitization**: Zod + ograniczenia długości (opcjonalnie 1-100 znaków).
- **Brak przecieków**: mapujemy błędy bazy na kody 409/422 bez ujawniania detali.

## 7. Obsługa błędów

| Sytuacja | Kod | Przykładowa `code` |
|----------|-----|--------------------|
| Payload niezgodny ze schematem | 400 | `INVALID_BODY` |
| Brak sesji | 401 | `UNAUTHENTICATED` |
| Zestaw nie istnieje / cudzy | 404 | `SET_NOT_FOUND` |
| Duplikat `en_norm` lub `position` (konflikt unikalności) | 409 | `WORD_DUPLICATE` |
| >5 pozycji lub >5 słów | 422 | `POSITION_RANGE_EXCEEDED` lub `WORDS_LIMIT_EXCEEDED` |
| Inne nieobsłużone | 500 | `INTERNAL_SERVER_ERROR` |

## 8. Rozważania dotyczące wydajności

- **Bulk insert** zamiast pętli – pojedynczy round-trip do bazy.
- Indeksy na `words(set_id, en_norm)` i `words(set_id, position)` istnieją ➜ szybkie sprawdzanie konfliktów.
- Ograniczenie do 5 słów minimalizuje payload.

## 9. Etapy wdrożenia

1. **Schemat walidacji** `src/lib/schemas/sets/wordsAdd.ts`
   ```ts
   import { z } from "zod";
   export const wordInputSchema = z.object({
     pl: z.string().min(1).max(100),
     en: z.string().min(1).max(100),
     position: z.number().int().min(1).max(5).optional(),
   });
   export const wordsAddSchema = z.object({
     words: z.array(wordInputSchema).min(1).max(5),
   });
   export type WordsAddInput = z.infer<typeof wordsAddSchema>;
   ```
2. **Service** `src/lib/services/sets/addWords.ts`
   - Eksport `addWords({ supabase, userId, setId, words }): Promise<WordsAddResponseDTO>`.
   - Implementacja z transakcją i strategią opisaną w sekcji *Przepływ danych*.
3. **API Route** `src/pages/api/sets/[setId]/words.ts`
   ```ts
   export const prerender = false;
   import { wordsAddSchema } from "@/lib/schemas/sets/wordsAdd";
   import { addWords } from "@/lib/services/sets/addWords";
   // ...handler POST
   ```
4. **Mapowanie błędów** – użyj istniejącej utilki `mapSupabaseError` lub dodaj w `src/lib/utils.ts`.
5. **Testy jednostkowe** – mock Supabase, pokrycie scenariuszy happy-path i error.
6. **Aktualizacja dokumentacji** – README + OpenAPI (jeśli generujemy).
7. **Przegląd bezpieczeństwa** – potwierdzenie RLS & walidacji.
8. **Deploy i Smoke-test** w środowisku staging.
