# Plan implementacji widoku Sety – lista

## 1. Przegląd

Widok prezentuje listę zestawów słówek należących do zalogowanego użytkownika. Każdy zestaw pokazywany jest w formie komponentu **SetCard**, zawierającego podstawowe informacje (nazwa, poziom CEFR, liczba słówek, ewentualny status aktywnej sesji) oraz przyciski akcji (rozpocznij ćwiczenia, edytuj, usuń). Celem widoku jest umożliwienie użytkownikowi szyb­kiego wyboru zestawu do ćwiczeń oraz podstawowych operacji zarządzania.

## 2. Routing widoku

```
/pages/sets.astro  →  /sets
```

Widok wymaga autoryzacji – w middleware `src/middleware/index.ts` istnieje już straż. Strona powinna przekierować do `/login`, jeżeli `user` jest `null`.

## 3. Struktura komponentów

```
SetsPage
 ├─ FiltersBar
 │   ├─ SearchInput
 │   └─ LevelSelect
 └─ SetsGrid
     └─ SetCard  (× N)
         ├─ CardHeader   (nazwa + menu akcji)
         ├─ CardBody     (CEFR, #words, status)
         └─ CardFooter   (CTA: „Ćwicz”)
```

## 4. Szczegóły komponentów

### SetsPage

- **Opis**: Strona-kontener. Odpowiada za pobieranie danych z API, przechowywanie stanu filtrów, paginacji i renderowanie gridu kart.
- **Elementy**: `<FiltersBar />`, `<SetsGrid />`, lazy-loaded `<Spinner />` (przy ładowaniu / paginacji).
- **Interakcje**:
  - Zmiana pól filtrów → update query state → refetch.
  - Scroll do końca listy → `onIntersect` → `loadNextPage()`.
- **Walidacja**: lokalna walidacja pól filtrów (search ≤100 znaków, level ∈ CEFRLevel).
- **Typy**:
  - `SetsQueryState` (patrz §5), `SetsPageVM`.
- **Propsy**: brak – to strona.

### FiltersBar

- **Opis**: Pasek z polem wyszukiwarki i selectem poziomu.
- **Elementy**: `<SearchInput />`, `<LevelSelect />` (select z enumem).
- **Interakcje**: `onChange` obu kontrolek emituje `partialQuery` upstream.
- **Walidacja**: patrz wyżej.
- **Typy**: `Partial<SetsQueryState>`.
- **Propsy**: `value`, `onChange`.

### SetsGrid

- **Opis**: Odpowiada za layout kart w siatce responsywnej (Tailwind `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- **Elementy**: `<SetCard />` instancje.
- **Interakcje**: `onSelect(id)` (przekliknięcie „Ćwicz”), `onEdit(id)`, `onDelete(id)` proxy do rodzica.
- **Walidacja**: none.
- **Typy**: `SetSummaryVM[]`.
- **Propsy**: `items`, `onSelect`, `onEdit`, `onDelete`.

### SetCard

- **Opis**: Karta prezentująca pojedynczy zestaw.
- **Elementy**: korzysta z `<Card />` i `<Button />` z shadcn/ui.
- **Interakcje**:
  - Klik „Ćwicz” → `onSelect`.
  - Ikona ołówka → `onEdit`.
  - Ikona kosza → `onDelete` (z potwierdzeniem).
- **Walidacja**: zapewnia, że przy „Usuń” wyświetlany jest `confirm()`.
- **Typy**: `SetSummaryVM`.
- **Propsy**: `{ item: SetSummaryVM, onSelect, onEdit, onDelete }`.

## 5. Typy

```ts
// CEFRLevel – już w src/types.ts
export type SetsQueryState = {
  search?: string;
  level?: CEFRLevel;
  cursor?: string;
  limit: number; // default 10
  sort: 'created_at_desc' | 'name_asc';
};

export type SetSummaryVM = {
  id: UUID;
  name: string;
  level: CEFRLevel;
  wordsCount: number;
  createdAt: ISODateString;
  hasActiveSession: boolean;
};

export type SetsPageVM = {
  items: SetSummaryVM[];
  nextCursor?: string;
  count: number;
};
```

## 6. Zarządzanie stanem

- React 19 z hooks.
- `useSets` (custom hook)
  - Wejście: `SetsQueryState`.
  - Samodzielnie wywołuje `GET /api/sets` z dopasowaniem parametrów.
  - Zwraca `{ data: SetsPageVM | undefined, loading, error, loadNextPage }`.
- Stan filtrów w `useSearchParams()` (Astro/React router) + lokalny `useState` dla kontroli.

## 7. Integracja API

```
GET /api/sets?search&level&cursor&limit&sort
```
Request params → `SetsQueryState` (z serializacją). Response → `SetsListResponseDTO`.
Mapping: `SetSummaryDTO` → `SetSummaryVM` (camelCase + `hasActiveSession` obecnie `false` – placeholder; prawdziwe dane wymagają innego endpointu, poza zakresem widoku).

## 8. Interakcje użytkownika

1. Użytkownik wpisuje tekst w wyszukiwarce → lista filtruje się.
2. Wybór poziomu CEFR → filtr.
3. Scroll do dołu → automatyczne pobranie kolejnej strony.
4. Klik „Ćwicz” → router push `/sets/{id}` (lub `/exercise/{id}` – zgodnie z istniejącym flow).
5. Klik „Edytuj” → modal / navigate do `/sets/{id}/edit`.
6. Klik „Usuń” → dialog potwierdzenia → `DELETE /api/sets/{id}` → on success optymistyczne usunięcie z listy.

## 9. Warunki i walidacja

- Search ≤ 100 znaków.
- Limit 1-50 (trzymamy `10`).
- Level must ∈ CEFRLevel enum.
- Przy opcji Usuń wymagana walidacja odpowiedzi `409 ACTIVE_SESSION` (nie można usunąć, jeśli trwa sesja).

## 10. Obsługa błędów

| Scenariusz | Reakcja UI |
|------------|-----------|
| `401` | Redirect `/login` |
| `422` | Toast z treścią błędu walidacji |
| `409 duplicate name` przy edycji | Toast – konflikt |
| `409 active_session` przy delete | Alert – „Nie można usunąć zestawu w trakcie aktywnej sesji” |
| Network fail | Global `ErrorBoundary` + retry button |

## 11. Kroki implementacji

1. **Routing** – dodać plik `src/pages/sets.astro` z kontenerem React.
2. **Typy** – dodać `SetSummaryVM`, `SetsQueryState` w `src/types.ts` lub dedykowanym module.
3. **Hook `useSets`** – implementacja fetch + infinite scroll.
4. **Komponenty**: `FiltersBar`, `SetsGrid`, `SetCard` w `src/components/sets/`.
5. **Integracja Tailwind** – klasy utility w komponentach.
6. **Walidacja pól** – debounce 300 ms dla wyszukiwania.
7. **Infinite scroll** – `IntersectionObserver` lub `react-intersection-observer`.
8. **Akcje kart** – obsługa `onSelect`, `onEdit`, `onDelete`.
9. **Obsługa błędów** – toast system (`@/components/ui/use-toast`).
