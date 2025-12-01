# Architektura UI dla SmartWordsAI

## 1. Przegląd struktury UI

Aplikacja dzieli się na dwie strefy o osobnych layoutach:

1. **Publiczna (SSR w Astro)** – strony dostępne bez logowania:
   • Landing (`/`)
   • Logowanie, rejestracja, reset hasła (`/auth/*`)
2. **Zalogowana (App Shell: Astro + React)** – po autoryzacji Supabase:
   • Dashboard i pozostałe widoki zaczynające się od `/app/*`

Każda strefa posiada własny układ (header, footer) oraz zestaw wysp React dla dynamicznych fragmentów.

## 2. Lista widoków

| # | Nazwa widoku | Ścieżka | Główny cel | Kluczowe informacje | Kluczowe komponenty | Uwagi UX/A11y/Security |
|---|--------------|---------|------------|---------------------|---------------------|------------------------|
| 1 | Landing | `/` | Prezentacja produktu + CTA "Zarejestruj się" / "Zaloguj" | Hero, opis wartości, grafika, przyciski CTA | `PublicLayout`, `Button` | Lekki, szybki; bez JS krytycznego; semantyczne nagłówki |
| 2 | Logowanie | `/auth/login` | Umożliwia dostęp zarejestrowanym użytkownikom | Formularz email + hasło, linki „Rejestracja”, „Reset hasła” | `AuthLayout`, `TextInput`, `PasswordInput`, `Button` | Walidacja Zod; aria-labels; httpOnly cookies |
| 3 | Rejestracja | `/auth/register` | Tworzy nowe konto | Formularz email, hasło, potwierdzenie hasła | j.w. | Walidacja min. 8 znaków; błędy inline |
| 4 | Reset hasła | `/auth/reset` | Inicjuje reset hasła | Pole email, potwierdzenie wysyłki maila | j.w. | Brak ujawniania istnienia konta |
| 5 | Dashboard | `/app/dashboard` | Centralny hub po zalogowaniu | Licznik generacji, CTA „Utwórz zestaw”, sekcja „Kontynuuj sesję”, statystyki | `AppShell`, `GenerationCounter`, `Card`, `Button` | Prefetch `/api/usage/daily`; responsywny układ grid |
| 6 | Lista zestawów | `/app/sets` | Przegląd i zarządzanie zestawami | Lista kart, wyszukiwarka, filtr CEFR, „Load more” | `SearchInput`, `Select`, `SetCard`, `InfiniteScrollTrigger` | Paginacja kursorowa; statusy kart |
| 7 | Widok zestawu | `/app/sets/:id` | Szczegóły zestawu + generacja zdań | Nazwa, poziom, lista słówek (CRUD), przycisk „Generuj zdania” | `Badge`, `WordList`, `WordEditorModal`, `GenerateButton` | Conservative update dla generacji; disabled + spinner |
| 8 | Sesja ćwiczeń | `/app/sessions/:id` | Tłumaczenie zdań | Pasek postępu, lista kart zdań, globalny przycisk „Zakończ” | `ProgressBar`, `SentenceCard`, `StickyHeader`, `EndSessionDialog` | Enter = sprawdź; Shift+Enter = nowa linia; aria-live feedback |
| 9 | Rating | (modal) | Ocena jakości po sesji | Gwiazdki 1–5, opcjonalny komentarz | `RatingDialog`, `StarRating`, `Textarea`, `Button` | Pojawia się tylko po full completion; focus trap |
|10 | 404 / Błąd | `*` | Obsługa błędów routingu | Komunikat i link do home | `ErrorLayout` | Semantyczny kod statusu, minimal info |

## 3. Mapa podróży użytkownika

1. **Anonimowy użytkownik** wchodzi na `/` → klika „Zarejestruj się” → formularz `/auth/register` → po sukcesie **redirect** do `/app/dashboard`.
2. **Dashboard** wyświetla licznik limitu oraz CTA „Utwórz zestaw”. Użytkownik klika → przechodzi do `/app/sets` w trybie create modal → tworzy zestaw → redirect do `/app/sets/:id`.
3. W **widoku zestawu** użytkownik klika „Generuj zdania” → mutacja `POST /api/sets/{id}/generate` → po sukcesie przycisk zmienia się na „Rozpocznij sesję” → kliknięcie wywołuje `POST /api/sessions` i redirect do `/app/sessions/:id`.
4. **Sesja**: użytkownik tłumaczy zdania; każde sprawdzenie to `POST /api/sessions/{id}/attempts` (inline feedback). Pasek postępu aktualizuje się po każdym poprawnym zdaniu.
5. Po ukończeniu wszystkich zdań użytkownik klika „Zakończ sesję” → `PATCH /api/sessions/{id}/finish` → otwiera się **RatingDialog** → `POST /api/sessions/{id}/rating` → powrót do **Dashboardu**.
6. Jeśli limit generacji osiągnięty, przycisk generacji w widoku zestawu jest disabled; dashboard informuje o reset o północy.

## 4. Układ i struktura nawigacji

```
<App>
 ├── <PublicLayout>
 │     ├── / (Landing)
 │     └── /auth/* (Login, Register, Reset)
 └── <AppShell>
       ├── Header (logo, licznik generacji, menu user)
       ├── Sidebar / nav (desktop) lub TabBar (mobile)
       │     ├── Dashboard
       │     └── Zestawy
       └── <Outlet /> (router)
              ├── /app/dashboard
              ├── /app/sets
              ├── /app/sets/:id
              └── /app/sessions/:id (+Rating modal)
```

Nawigacja opiera się na **Astro+React Router** w obrębie App Shellu. PublicLayout nie ładuje ciężkich pakietów React.

## 5. Kluczowe komponenty (wielokrotnego użycia)

- **AppShell** – kontener zalogowanej części, auth guard, provider TanStack Query.
- **Header** – logo, licznik generacji (`GenerationCounter`), avatar z menu „Wyloguj”.
- **Sidebar / TabBar** – główne linki (Dashboard, Zestawy).
- **SetCard** – prezentacja zestawu w liście (nazwa, CEFR, liczba słówek, status, CTA).
- **WordList & WordEditorModal** – edycja słówek w zestawie.
- **GenerateButton** – stanowe CTA generacji (idle / loading / disabled-limit).
- **SentenceCard** – pojedyncze zdanie w sesji: tekst PL, textarea EN, przycisk „Sprawdź”, feedback.
- **ProgressBar / MiniProgress** – pasek postępu globalny + mini-index.
- **EndSessionDialog** – potwierdzenie zakończenia przy nieukończonych zdaniach.
- **RatingDialog** – gwiazdki + komentarz, focus trap, aria-modal.
- **ErrorBanner** – globalne błędy (401/403) z akcją „Zaloguj ponownie”.
- **InfiniteScrollTrigger** – sentry div dla „Load more” w liście zestawów.

---

> Niniejszy dokument mapuje wymagania PRD oraz plan API na strukturę UI, zapewniając zgodność ścieżek, przepływów i komponentów z backendem oraz najlepszymi praktykami UX, a11y i bezpieczeństwa.
