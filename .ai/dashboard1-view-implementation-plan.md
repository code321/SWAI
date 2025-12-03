# Plan implementacji widoku Dashboard

## 1. Przegląd

Widok **Dashboard** stanowi centralny hub po zalogowaniu, prezentując użytkownikowi kluczowe informacje o stanie konta: liczbę pozostałych generacji zdań, szybkie CTA do utworzenia nowego zestawu słówek, możliwość kontynuowania ostatniej sesji ćwiczeń oraz statystyki (liczba zestawów, ostatnie aktywności). Ma zachęcać do dalszych działań w aplikacji oraz dostarczać podsumowanie postępów.

## 2. Routing widoku

- Ścieżka: `/app/dashboard`
- Dostęp: wyłącznie dla zalogowanych użytkowników (middleware `auth`)
- Prefetch: nawigacja z innych widoków powinna wykorzystywać `prefetch` Astro (`astro:prefetch`) w linkach do dashboardu.

## 3. Struktura komponentów

```
DashboardPage (/app/dashboard)
└─ AppShell (layout)
   ├─ DashboardHeader
   │   ├─ Logo
   │   ├─ GenerationCounter
   │   └─ UserMenu (avatar + „Wyloguj”)
   ├─ DashboardGrid (responsive)
   │   ├─ CreateSetCard (CTA „Utwórz zestaw”)
   │   ├─ ContinueSessionCard (warunkowo)
   │   ├─ StatsCard (liczba zestawów)
   │   └─ EventsCard (opcjonalnie)
   └─ Footer (reuse global)
```

## 4. Szczegóły komponentów

### DashboardPage
- **Opis**: Strona Astro, która pobiera dane z API (`/api/dashboard`, `/api/usage/daily`) w `getStaticPaths`/`get` i przekazuje je jako propsy do React-owego DashboardGrid.
- **Elementy**: wrapper `AppShell`; wewnątrz render `DashboardGrid`.
- **Interakcje**: brak bezpośrednich.
- **Walidacja**: przekazanie poprawnych DTO; fallback do stanu "loading"/"error".
- **Typy**: `DashboardDTO`, `UsageDailyDTO`, `DashboardViewProps` (custom VM).
- **Propsy**: `{ dashboard: DashboardDTO; usage: UsageDailyDTO }`

### GenerationCounter
- **Opis**: Wyświetla format `X/10 generacji dzisiaj`; koloruje się na czerwono przy `remaining === 0`.
- **Elementy**: `span` z liczbą, ikona `sparkles`.
- **Interakcje**: none.
- **Walidacja**: `limit > 0`, `used <= limit`.
- **Typy**: `{ limit: number; used: number; remaining: number }`.
- **Propsy**: `UsageDailyDTO`.

### CreateSetCard
- **Opis**: Karta (`Card` z Shadcn) z przyciskiem `Button` „Utwórz zestaw”.
- **Elementy**: nagłówek, opis korzyści, `Button`.
- **Interakcje**: onClick → `router.push('/app/sets?mode=create')`.
- **Walidacja**: przy braku limitu generacji CTA nadal aktywne.
- **Typy**: none extra.
- **Propsy**: none.

### ContinueSessionCard
- **Opis**: Pokazuje podsumowanie aktywnej sesji i przycisk „Kontynuuj”. Renderuje się tylko gdy `dashboard.active_session` != null.
- **Elementy**: tytuł z nazwą zestawu (wymaga dodatkowego fetchu lub przekazania `set_id`→client fetch), licznik czasu od rozpoczęcia, `Button` „Kontynuuj”.
- **Interakcje**: onClick → `router.push('/app/sessions/' + session_id)`.
- **Walidacja**: `session_id` exists.
- **Typy**: `DashboardActiveSessionDTO`.
- **Propsy**: `activeSession?: DashboardActiveSessionDTO`.

### StatsCard
- **Opis**: Prosta karta pokazująca liczbę zestawów (`sets_total`).
- **Elementy**: icon + counter.
- **Interakcje**: onClick → `router.push('/app/sets')` (cała karta klikalna).
- **Walidacja**: `sets_total >= 0`.
- **Typy**: `{ setsTotal: number }`.
- **Propsy**: `setsTotal: number`.

### EventsCard (opcjonalnie)
- **Opis**: Pokazuje ostatnie 3 zdarzenia z `dashboard.events`.
- **Elementy**: lista `<ul>` z opisami.
- **Interakcje**: brak.
- **Walidacja**: none.
- **Typy**: `DashboardEventDTO[]`.
- **Propsy**: `events?: DashboardEventDTO[]`.

## 5. Typy

```ts
// DashboardViewProps
interface DashboardViewProps {
  dashboard: DashboardDTO;
  usage: UsageDailyDTO;
}

// GenerationCounterVM
interface GenerationCounterVM {
  limit: number;
  used: number;
  remaining: number;
  resetAt: ISODateString;
}
```
Dodatkowe mapowania VM będą tworzone w hookach (np. `useGenerationCounter`).

## 6. Zarządzanie stanem

- SSR/SSG: dane pobierane po stronie serwera przez Astro (`await fetch`) z nagłówkiem `sb-access-token` z ciasteczka.
- Reaktywność klienta: `useState` tylko dla UI (hover, menu). Brak globalnego store.
- Custom hooki:
  - `useGenerationCounter(usage: UsageDailyDTO) → GenerationCounterVM`
  - `useDashboardData(initial: DashboardDTO)` – opcjonalny SWR do revalidate on focus.

## 7. Integracja API

| Akcja | Metoda | Endpoint | Typ żądania | Typ odpowiedzi | Zastosowanie |
|-------|--------|----------|-------------|----------------|--------------|
| Pobranie limitu | GET | `/api/usage/daily` | - | `UsageDailyDTO` | GenerationCounter |
| Pobranie dashboardu | GET | `/api/dashboard?include_events=true` | - | `DashboardDTO` | DashboardGrid |

Zapytania wykonujemy na serwerze; w przypadku błędu zwracamy status 500 i wyświetlamy stronę błędu Astro.

## 8. Interakcje użytkownika

1. Kliknięcie **Utwórz zestaw** → przejście do widoku zestawów z otwartym modalem tworzenia.
2. Kliknięcie **Kontynuuj** → przejście do aktywnej sesji.
3. Kliknięcie **Statystyka zestawów** → lista zestawów.
4. Kliknięcie **Avatar → Wyloguj** → wywołanie `/auth/v1/logout` + redirect na `/login`.

## 9. Warunki i walidacja

- GenerationCounter: jeśli `remaining === 0` przycisk „Generuj” w innych widokach jest dezaktywowany (emitujemy event bus / context).
- ContinueSessionCard renderuje się warunkowo.
- Wszystkie liczby muszą być nieujemne.

## 10. Obsługa błędów

| Scenariusz | Zachowanie UI |
|------------|---------------|
| Brak połączenia z API | Wyświetlenie bannera „Wystąpił błąd. Spróbuj ponownie później.” |
| `401 Unauthorized` | Redirect do `/login` (middleware) |
| `500 Internal` | Strona błędu z przyciskiem „Odśwież” |

## 11. Kroki implementacji

1. **Routing**: Dodaj plik `src/pages/app/dashboard.astro` dziedziczący po `Layout.astro`.
2. **SSR fetch**: w loaderze pobierz `dashboard` i `usage` z API (z tokenem).
3. **Componenty UI**: utwórz folder `src/components/dashboard` i zaimplementuj:
   - `GenerationCounter.tsx`
   - `CreateSetCard.tsx`
   - `ContinueSessionCard.tsx`
   - `StatsCard.tsx`
   - `EventsCard.tsx`
4. **DashboardGrid**: ułóż responsywny układ Tailwind (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
5. **Hooki**: `useGenerationCounter`, `useDashboardData`.
6. **Styling**: wykorzystaj Shadcn/ui `Card`, `Button`, ikonografia Heroicons.