# Plan implementacji widoku „Szczegóły zestawu” (`/app/sets/:id`)

## 1. Przegląd
Widok wyświetla szczegóły pojedynczego zestawu słówek – nazwę, poziom CEFR, listę słówek oraz przycisk do wygenerowania przykładowych zdań. Umożliwia pełną obsługę CRUD słówek oraz inicjowanie generacji zdań i rozpoczęcie sesji ćwiczeń.

## 2. Routing widoku
`/app/sets/:id` – chroniona ścieżka w obrębie `AppShell`. Router: React Router v6 (`<Route path="/app/sets/:id" element={<SetPage/>} />`).

## 3. Struktura komponentów
```
<SetPage>
 ├── <HeaderBar>          ← nazwa zestawu, badge CEFR, przycisk „Edytuj” (przyszłe)
 ├── <WordList>
 │     ├── <WordRow>* n   ← każda posiada akcje Edit / Delete
 │     └── <EmptyState>   ← info gdy brak słówek
 ├── <GenerateButton>
 ├── <WordEditorModal>    ← portal; create & edit
 └── <ConfirmDialog>      ← usunięcie słowa (re-używalny)
```

## 4. Szczegóły komponentów

### 4.1 `SetPage`
- **Opis**: Kontener strony; pobiera dane zestawu, zarządza stanem modali i mutacji.
- **Elementy**: `HeaderBar`, `WordList`, `GenerateButton`, modale.
- **Interakcje**: mount → fetch; onWordAdd/onWordEdit/onWordDelete → refetch lub optimistic update; onGenerate → mutate; po sukcesie generacji ustawia `generationState = "ready"`.
- **Walidacja**: brak (delegowana do dzieci).
- **Typy**: `SetDetailVM` (patrz §5), `GenerationStatus` enum.
- **Propsy**: none – id pobrane z `useParams()`.

### 4.2 `HeaderBar`
- **Opis**: Pasek tytułu widoku.
- **Elementy**: `<h1>`, `Badge` (poziom CEFR), opcjonalnie ikonka edycji nazwy.
- **Interakcje**: —
- **Walidacja**: —
- **Typy**: `{ name: string; level: CEFRLevel }`.
- **Propsy**: `name`, `level`.

### 4.3 `WordList`
- **Opis**: Tabela/Lista słówek.
- **Elementy**: wiersze `<WordRow>` lub `<EmptyState>`.
- **Interakcje**: click Edit → `onEdit(word)`; click Delete → `onDelete(wordId)`.
- **Walidacja**: wyłączenie przycisków podczas mutacji.
- **Typy**: `WordVM[]`.
- **Propsy**: `words`, `onEdit`, `onDelete`.

### 4.4 `WordRow`
- **Opis**: Pojedyncze słówko.
- **Elementy**: kolumny PL/EN, przyciski akcji.
- **Interakcje**: jak wyżej.
- **Walidacja**: —
- **Typy**: `WordVM`.
- **Propsy**: `word`, `onEdit`, `onDelete`.

### 4.5 `WordEditorModal`
- **Opis**: Modal do dodawania/edycji słów.
- **Elementy**: 2 pola tekstowe (PL, EN), przycisk Zapisz.
- **Interakcje**: submit → wywołuje `POST /words` (create) lub `PATCH /words/{wordId}` (edit).
- **Walidacja**: Zod (1-200 znaków, oba pola wymagane przy create, ≥1 pole przy edit).
- **Typy**: `WordFormValues`.
- **Propsy**: `initialValues?`, `mode: "create" | "edit"`, `onSuccess`.

### 4.6 `GenerateButton`
- **Opis**: Stanowy przycisk Akcja → Generuj ↔ Rozpocznij sesję.
- **Elementy**: `<Button>` z ikoną/spinnerem.
- **Interakcje**:
  - tryb `idle` → klik: `POST /api/sets/{id}/generate`.
  - tryb `loading` → disabled, spinner.
  - tryb `ready` → klik: `POST /api/sessions` + redirect.
- **Walidacja**: disabled przy braku słów lub `remaining_generations === 0`.
- **Typy**: `GenerationStatus` enum, `remainingGenerations: number`.
- **Propsy**: `status`, `onGenerate`, `onStartSession`, `remainingGenerations`.

### 4.7 `ConfirmDialog`
Re-używalny komponent potwierdzenia usunięcia.

## 5. Typy
```ts
// Widok
export type WordVM = {
  id: UUID;
  pl: string;
  en: string;
};

export type SetDetailVM = {
  id: UUID;
  name: string;
  level: CEFRLevel;
  words: WordVM[];
  wordsCount: number;
  latestGeneration?: { id: UUID; occurredAt: ISODateString } | null;
};

export enum GenerationStatus {
  Idle = "idle",       // brak aktywnej generacji
  Loading = "loading", // trwa POST /generate
  Ready = "ready"       // sukces → można rozpocząć sesję
}
```

## 6. Zarządzanie stanem
- **React Query**:
  - `useQuery(['set', id], fetchSet)` – zwraca `SetDetailVM`.
  - `useMutation(addWord)`, `useMutation(updateWord)`, `useMutation(deleteWord)` – z optimistic update listy.
  - `useMutation(triggerGeneration)` – ustawia `generationStatus`.
- **Lokalny state** (`useState`) w `SetPage`:
  - `isWordModalOpen`, `editorMode`, `selectedWord`.
  - `generationStatus: GenerationStatus`.

## 7. Integracja API
| Akcja | Endpoint | Request | Response | Aktualizacja stanu |
|-------|----------|---------|----------|--------------------|
| Pobranie danych | `GET /api/sets/:id` | – | `SetDetailDTO` → map to `SetDetailVM` | `query.setData` |
| Dodanie słów | `POST /api/sets/:id/words` | `WordsAddCommand` | `WordsAddResponseDTO` | merge `added` do listy, update `wordsCount` |
| Edycja słowa | `PATCH /api/sets/:id/words/:wordId` | `WordUpdateCommand` | `WordUpdateResponseDTO` | replace w cache |
| Usunięcie słowa | `DELETE /api/sets/:id/words/:wordId` | – | `WordDeleteResponseDTO` | remove z cache, update count |
| Generacja zdań | `POST /api/sets/:id/generate` | `SetGenerationCommand` | `GenerationResponseDTO` | `generationStatus = Ready` |
| Start sesji | `POST /api/sessions` (jeszcze niezaimplement.) | body: `{ set_id, generation_id }` | `SessionCreateResponseDTO` | redirect to `/app/sessions/:id` |

## 8. Interakcje użytkownika
1. Otworzenie strony → ładowanie danych (skeletons).
2. Klik „Dodaj słówko” → otwiera modal w trybie *create*.
3. Klik Edit przy słowie → modal *edit* z prefill.
4. Klik Delete → `ConfirmDialog` → po potwierdzeniu usuwa.
5. Klik „Generuj zdania” → spinner, przycisk disabled.
6. Po sukcesie → toast „Wygenerowano zdania”, przycisk zmienia label na „Rozpocznij sesję”.
7. Klik „Rozpocznij sesję” → rozpoczęcie i redirect.

## 9. Warunki i walidacja
- **WordEditorModal**:
  - oba pola wymagane przy create.
  - min 1, max 200 znaków.
  - unikalność EN w ramach widoku (szybka walidacja lokalna) + obsługa błędu 409 z API.
- **GenerateButton** disabled, gdy:
  - brak słów (`wordsCount === 0`)
  - lub `remainingGenerations === 0`.

## 10. Obsługa błędów
- Toasty z `react-hot-toast`:
  - 400/422 → „Nieprawidłowe dane wejściowe”.
  - 404 → redirect do `/app/sets` + banner „Zestaw nie istnieje”.
  - 409 → „Duplikat słowa / nazwy”.
  - 500 → „Wystąpił błąd serwera, spróbuj ponownie później”.
- Glob. interceptor 401 → logout.

## 11. Kroki implementacji
1. **Routing + szkielet strony** `SetPage.tsx` w `src/pages/app/`.
2. **Hook `useSetDetail`** (React Query) + mapowanie DTO→VM.
3. **Komponenty UI**: `HeaderBar`, `WordList`, `WordRow`, `GenerateButton` w `src/components/sets/detail/`.
4. **WordEditorModal** z formem React Hook Form + Zod.
5. **CRUD mutacje** słów z optimistic update.
6. **GenerateButton** – implementacja stanów + mutacja generacji.
7. **Integracja Sesji** – call `POST /api/sessions` po generacji.
8. **Obsługa błędów + toasty**.
10. **CSS / Tailwind** – responsywność (mobile ↔ desktop).
