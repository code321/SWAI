# Specyfikacja architektury modułu Auth (US-001, US-002, US-003, US-012)

Dokument opisuje docelową architekturę modułu **rejestracji, logowania, wylogowania i resetu hasła** dla SmartWordsAI, zgodną z wymaganiami z `./.ai/prd.md` (US-001..US-003, US-012) i technologiami z `./.ai/tech-stack.md`.

Zakres dokumentu: **bez implementacji**, ale ze wskazaniem **konkretnych stron, komponentów, modułów, usług i kontraktów API** oraz sposobu integracji z Astro (SSR) i Supabase Auth.

## Założenia i ograniczenia (kompatybilność z obecną aplikacją)

- Aplikacja działa w trybie SSR: `astro.config.mjs` ma `output: "server"` i adapter `@astrojs/node` w trybie `standalone`. Oznacza to:
  - strony wymagające cookies/sesji muszą mieć `export const prerender = false`;
  - middleware Astro jest najlepszym miejscem do **ustawiania `locals`**, wymuszania dostępu i ewentualnego odświeżania sesji.
- Obecne endpointy API mają wzorzec walidacji Zod i “TODO: auth middleware”, a `userId` jest tymczasowo hardkodowany. Moduł auth musi:
  - dostarczyć **jednoznaczne źródło `userId`** dla API (z tokenu);
  - nie naruszyć istniejących kontraktów DTO w `src/types.ts` (już zawiera typy `Auth*`).
- W bazie Supabase RLS było zdefiniowane, ale zostało wyłączone (migracja `disable_all_policies`). Aktualnie bezpieczeństwo danych opiera się na backendzie (filtrowanie po `user_id`) oraz walidacji tokenu.
  - Architektura nie wymusza natychmiastowego przywrócenia RLS, ale przewiduje to jako krok hardeningu.

## Cel funkcjonalny (wymagania PRD)

- **US-001 Rejestracja**: email + hasło; walidacja email; hasło min. 8; po rejestracji użytkownik jest **automatycznie zalogowany**; komunikat sukcesu; redirect do dashboardu.
- **US-002 Logowanie**: email + hasło; walidacja; po sukcesie redirect do dashboardu; po błędzie komunikat; sesja zachowana.
- **US-003 Reset hasła**: formularz email; wysyłka linku resetującego; link ważny 24h; ustawienie nowego hasła z linku; po zmianie można zalogować się nowymi danymi.
- **US-012 Wylogowanie**: zakończenie sesji; redirect na stronę logowania; blokada dostępu do tras chronionych.

---

## 1) ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Docelowe trasy i widoki (Astro pages)

#### Strefy nawigacyjne
- **Public (non-auth)**:
  - `GET /` (obecne `src/pages/index.astro`) – pozostaje landingiem, ale powinien mieć CTA do logowania/rejestracji.
  - `GET /login` – strona logowania.
  - `GET /register` – strona rejestracji.
  - `GET /forgot-password` – strona “Nie pamiętasz hasła?” (wysyłka linku).
  - `GET /reset-password` – strona ustawienia nowego hasła po wejściu z linku recovery.
- **Protected (auth)**:
  - `GET /app/dashboard` (obecne `src/pages/app/dashboard.astro`) – wymaga zalogowania.
  - `GET /app/sets`, `GET /app/sets/[id]`, `GET /app/sessions/[id]` (obecne) – wymaga zalogowania.

#### Zasady redirectów
- Jeśli użytkownik **niezalogowany** wchodzi na `/app/*`:
  - middleware przekierowuje do `/login?next=<pierwotny_url>`.
- Jeśli użytkownik **zalogowany** wchodzi na `/login` lub `/register`:
  - middleware przekierowuje do `/app/dashboard` (lub do `next`, jeśli obecny).

### 1.2. Layouty i komponenty (rozdział odpowiedzialności Astro vs React)

#### Layouty Astro (server-side, nawigacja, SSR i ochrona)
Wprowadzamy rozdzielenie layoutów na:
- `src/layouts/PublicLayout.astro`:
  - używany przez: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`;
  - renderuje “public header” (logo, linki do logowania/rejestracji), bez menu użytkownika;
  - nie wymaga danych z sesji.
- `src/layouts/AppLayout.astro`:
  - używany przez wszystkie `/app/*`;
  - zakłada, że użytkownik jest już zweryfikowany przez middleware;
  - renderuje spójny topbar (`SmartWordsAI`, linki `/app/dashboard`, `/app/sets`) + `UserMenu` z prawdziwym `userEmail`.

Uwaga kompatybilności: obecnie strony `/app/*` ręcznie budują topbar w każdym pliku. Docelowo przenosimy to do `AppLayout.astro`, aby nie duplikować logiki i móc centralnie wstrzykiwać dane użytkownika.

#### Komponenty React (client-side, formularze, UX, akcje użytkownika)
W warstwie React projektujemy wyłącznie elementy wymagające interakcji:
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- opcjonalnie: `src/components/auth/AuthPageShell.tsx` (wspólna ramka dla stron auth – nagłówek, opis, slot na formularz, linki pomocnicze).

Odpowiedzialności React:
- zarządzanie stanem formularza (inputy, loading, error/success);
- walidacja “na froncie” (szybki feedback) zgodna z backendem;
- wywołania `fetch("/api/auth/...")`;
- obsługa `next` (redirect po sukcesie).

Odpowiedzialności Astro:
- routowanie i SSR skeleton (layout);
- bezpieczeństwo wejścia na trasę (redirecty w middleware);
- ewentualne SSR pobieranie danych (np. dashboard) wyłącznie po autoryzacji.

### 1.3. Kontrakty UI (walidacje, komunikaty, stany)

#### Walidacje
Wymagane reguły (frontend + backend):
- **Email**:
  - wymagany;
  - format email (np. Zod `z.string().email()`).
- **Hasło**:
  - wymagane;
  - minimum 8 znaków (PRD).
- **Powtórz hasło** (tylko register/reset):
  - musi być identyczne jak `password`.
- **Timezone** (register, wymaganie pochodne ze schematu DB):
  - **nie jest polem w UI** w MVP; wartość jest zbierana automatycznie na froncie na podstawie przeglądarki: `Intl.DateTimeFormat().resolvedOptions().timeZone`;
  - backend traktuje to jako dane pomocnicze do utworzenia `profiles` (zgodnie z `profiles.timezone not null`).

#### Stany formularzy
Każdy formularz powinien obsługiwać:
- **Idle**: gotowy do wpisywania;
- **Submitting**: blokada przycisku, spinner;
- **Success**: komunikat + redirect (z opóźnieniem 0–500ms) lub przycisk “Przejdź dalej”;
- **Error**: komunikat błędu (zmapowany z `ApiErrorDTO`), bez kasowania pól (poza hasłem opcjonalnie).

#### Standard komunikatów błędów (UX)
Wszystkie błędy z backendu przychodzą jako:
- `ApiErrorDTO`:
  - `error.code` – stabilny identyfikator dla logiki UI,
  - `error.message` – tekst do wyświetlenia (PL).

Przykładowe kody i ich prezentacja:
- `INVALID_EMAIL`: “Podaj poprawny adres email.”
- `WEAK_PASSWORD`: “Hasło musi mieć minimum 8 znaków.”
- `EMAIL_ALREADY_REGISTERED`: “Konto z tym adresem email już istnieje.”
- `INVALID_CREDENTIALS`: “Nieprawidłowy email lub hasło.”
- `RESET_EMAIL_SENT`: “Jeśli konto istnieje, wysłaliśmy link do resetu hasła.”
- `RECOVERY_TOKEN_INVALID`: “Link do resetu hasła jest nieprawidłowy lub wygasł.”
- `UNAUTHORIZED`: “Zaloguj się, aby kontynuować.”

### 1.4. Najważniejsze scenariusze (user journeys)

#### Rejestracja (US-001)
1. Użytkownik wchodzi na `/register`.
2. Wpisuje email + hasło (>=8) i wysyła.
3. Frontend: waliduje i wysyła `POST /api/auth/signup`.
4. Backend: tworzy konto w Supabase Auth, tworzy `profiles` (timezone), ustawia cookies sesyjne.
5. UI: pokazuje komunikat sukcesu, redirect do `/app/dashboard` (lub `next`).

#### Logowanie (US-002)
1. Użytkownik wchodzi na `/login?next=...` lub `/login`.
2. Wysyła `POST /api/auth/login`.
3. Backend: weryfikuje dane (Supabase), ustawia cookies.
4. UI: redirect do `/app/dashboard` lub `next`.
5. Sesja: zachowana dzięki cookies HttpOnly.

#### Reset hasła (US-003)
1. Użytkownik wchodzi na `/forgot-password`, wpisuje email.
2. `POST /api/auth/recover` wysyła mail z linkiem resetującym (ważny 24h – ustawienie Supabase).
3. Po kliknięciu linku użytkownik trafia na `/reset-password` (redirectTo z Supabase).
4. `/reset-password` pozwala ustawić nowe hasło (minimum 8).
5. Po sukcesie: komunikat + link/redirect do `/login`.

---

## 2) LOGIKA BACKENDOWA

### 2.1. Struktura endpointów API (Astro API routes)

Nowe endpointy w `src/pages/api/auth/*` (kontrakty zgodne z `src/types.ts`):

1) `POST /api/auth/signup`
- **Body**: `AuthSignUpCommand`:
  - `email: string`
  - `password: string`
  - `data: { timezone: string }`
- **Success (201)**: `AuthSessionDTO` + ustawione cookies.
- **Errors**:
  - 400 `VALIDATION_ERROR` (np. email format, password < 8)
  - 409 `EMAIL_ALREADY_REGISTERED`
  - 500 `INTERNAL_SERVER_ERROR`

2) `POST /api/auth/login`
- **Body**: `AuthLoginCommand` (`email`, `password`)
- **Success (200)**: `AuthSessionDTO` + cookies.
- **Errors**:
  - 400 `VALIDATION_ERROR`
  - 401 `INVALID_CREDENTIALS`

3) `POST /api/auth/logout`
- **Body**: brak
- **Success (200)**: `AuthLogoutResponseDTO` (`{ message: "LOGGED_OUT" }`) + skasowane cookies.

4) `POST /api/auth/recover`
- **Body**: `AuthRecoverCommand` (`email`)
- **Success (200)**: `AuthRecoverResponseDTO` (`{ message: "RESET_EMAIL_SENT" }`)
  - Zasada bezpieczeństwa: odpowiedź sukcesu również wtedy, gdy email nie istnieje (nie zdradzamy istnienia konta).

5) `POST /api/auth/exchange`
- **Cel**: zamienić tokeny recovery z linku na **HttpOnly cookies** sesyjne (żeby nie przechowywać ich w localStorage).
- **Body** (MVP, implicit recovery flow): `{ accessToken: string, refreshToken: string }`
- **Success (200)**: `{ isAuthenticated: true }` + ustawione cookies.
- **Errors**:
  - 400 `VALIDATION_ERROR`
  - 401 `RECOVERY_TOKEN_INVALID`

6) `POST /api/auth/reset-password`
- **Cel**: ustawienie nowego hasła w ramach **już ustanowionej** sesji recovery (po `exchange`).
- **Body**: `{ password: string }`
- **Success (200)**: `{ message: "PASSWORD_UPDATED" }`
- **Errors**:
  - 400 `VALIDATION_ERROR`
  - 401 `UNAUTHORIZED` (np. brak sesji recovery)

7) `GET /api/auth/session` (pomocnicze)
- **Success (200)**: `{ user: { id, email }, isAuthenticated: true }`
- **Errors**: 401 `UNAUTHORIZED`
- Użycie: szybkie pobranie `userEmail` do `UserMenu` w trybie client-side, jeśli nie wstrzykujemy tego SSR.

### 2.2. Modele danych i powiązania (Supabase)

- Supabase Auth: `auth.users` (źródło prawdy użytkownika).
- Tabela `profiles`:
  - `user_id` (PK, FK do `auth.users.id`)
  - `timezone` (not null)
  - `created_at`

Powiązania istniejących danych:
- `sets.user_id` referencjonuje `profiles.user_id`
- wszystkie rekordy “użytkownikowe” są wiązane z `user_id` (UUID auth usera).

Wymóg rejestracji: po `signUp` tworzymy `profiles` dla nowego usera (timezone z formularza).

### 2.3. Mechanizm walidacji danych wejściowych

Wzorzec zgodny z istniejącymi endpointami (`lib/schemas/*.ts`):
- nowy plik: `src/lib/schemas/auth.ts` z Zod:
  - `authSignUpCommandSchema`
  - `authLoginCommandSchema`
  - `authRecoverCommandSchema`
  - `authResetPasswordCommandSchema`

Zasady:
- walidacja na wejściu endpointu (guard clause), zanim wykonamy call do Supabase;
- błędy walidacji mapowane do `ApiErrorDTO` z czytelnymi komunikatami (PL), spójnie ze stylem obecnego API.

### 2.4. Obsługa wyjątków (spójna mapa błędów)

Mechanizm:
- zewnętrzne błędy Supabase (`AuthApiError`) mapujemy na stabilne `error.code` dla UI.
- błędy wewnętrzne: logujemy serwerowo, zwracamy `INTERNAL_SERVER_ERROR` bez wrażliwych danych.

Rekomendacja: rozszerzyć `toApiError()` o auth-specyficzne kody:
- `INVALID_CREDENTIALS` (401)
- `EMAIL_ALREADY_REGISTERED` (409)
- `RECOVERY_TOKEN_INVALID` (400/401)
- `PASSWORD_TOO_SHORT` / `WEAK_PASSWORD` (400)

### 2.5. Aktualizacja SSR wybranych stron (z uwzględnieniem `output: "server"`)

#### Strony `/app/*`
Docelowo:
- `export const prerender = false` pozostaje (już jest).
- Dane SSR (np. dashboard) nie powinny zależeć od “opcjonalnego tokenu”.
  - Po wdrożeniu auth middleware, strony `/app/*` są gwarantowanie w kontekście zalogowanego użytkownika.
  - SSR może korzystać z `Astro.locals.auth` (patrz middleware) zamiast wykonywać `fetch` do własnych endpointów z ręcznym przekazywaniem cookie.

#### Strony auth (`/login`, `/register`, `/forgot-password`, `/reset-password`)
Również `prerender = false`, bo:
- mogą czytać `next` z query i wykonywać redirect;
- `/reset-password` zwykle zależy od parametrów recovery z URL.

---

## 3) SYSTEM AUTENTYKACJI (Supabase Auth + Astro)

### 3.1. Strategia sesji: cookies HttpOnly jako źródło prawdy

Wymóg “sesja zachowana” (US-002) realizujemy przez cookies:
- `sb-access-token` (JWT) – HttpOnly, `SameSite=Lax`, `Secure` w prod, `Path=/`
- `sb-refresh-token` – HttpOnly, `SameSite=Lax`, `Secure` w prod, `Path=/`

Dlaczego cookies:
- endpointy `/api/*` już czytają cookies (`sb-access-token`) – architektura jest spójna z aktualnym kodem;
- SSR stron Astro może korzystać z cookies bez ekspozycji tokenów do JS;
- React fetchuje `/api/*` “normalnie” (cookies idą automatycznie).

### 3.2. Middleware Astro: centralne miejsce autoryzacji i `locals`

Rozszerzamy `src/middleware/index.ts` (konceptualnie) o:
- wczytanie cookies `sb-access-token` / `sb-refresh-token`;
- weryfikację użytkownika przez Supabase:
  - `supabase.auth.getUser(accessToken)` → daje `userId` i `email`;
- ustawienie:
  - `context.locals.supabase` (już jest),
  - `context.locals.auth = { userId, email, accessToken }` (nowe).
- wymuszenie dostępu:
  - jeśli `pathname` zaczyna się od `/app/` i brak ważnej sesji → redirect do `/login?next=...`;
  - jeśli `/login|/register` i sesja jest ważna → redirect do `/app/dashboard`.

### 3.3. Odświeżanie tokenu (refresh) – minimalny, bezpieczny mechanizm

Problem: access token może wygasnąć, a UI ma działać bez ponownego logowania.

Rekomendowany mechanizm:
- middleware próbuje `getUser(accessToken)`:
  - jeśli OK → kontynuuj;
  - jeśli “JWT expired” i istnieje `sb-refresh-token`:
    - backend wywołuje Supabase `refreshSession({ refresh_token })` (lub równoważny mechanizm w supabase-js v2),
    - ustawia nowe cookies,
    - powtarza `getUser()` i dopiero wtedy przepuszcza request.
- jeśli refresh się nie uda:
  - wyczyść cookies,
  - redirect do `/login?next=...`.

### 3.4. Rejestracja i auto-login (US-001) a konfiguracja Supabase

Kryterium “po rejestracji użytkownik jest automatycznie zalogowany” wymaga jednego z podejść:

- **MVP (rekomendowane dla zgodności z PRD)**: w Supabase Auth wyłączone “Email confirmations”.
  - `signUp` zwraca sesję od razu → możemy ustawić cookies i zrobić redirect.

- **Jeśli email confirmation ma pozostać włączone** (hardening):
  - PRD trzeba interpretować jako “auto-login po potwierdzeniu email” (zmienia UX),
  - wymagany dodatkowy flow: `/auth/callback` + komunikat “Sprawdź email”.

W tej specyfikacji przyjmujemy tryb MVP (confirmations OFF), bo inaczej nie spełnimy US-001 bez redefinicji.

### 3.5. Reset hasła (US-003) – kontrakt i bezpieczny flow w SSR

Supabase wysyła link resetujący, którego format zależy od konfiguracji (“implicit flow” z tokenem w hash vs PKCE z `code`).

Docelowy wariant (MVP, zgodny z cookies HttpOnly i bez localStorage):
- W `resetPasswordForEmail(email, { redirectTo })` ustawiamy `redirectTo` na stronę w naszej aplikacji, np. `GET /reset-password`.
- Na `/reset-password` działa React `ResetPasswordForm`, który:
  - wykrywa parametry recovery z URL (najczęściej w **hash**: `#access_token=...&refresh_token=...&type=recovery`),
  - wysyła `POST /api/auth/exchange` z `{ accessToken, refreshToken }`, aby backend ustawił **HttpOnly cookies**,
  - następnie wysyła `POST /api/auth/reset-password` z nowym hasłem.

Ważne właściwości:
- token recovery nie powinien być trwale przechowywany w localStorage;
- po udanym `exchange` ustawiamy standardowe cookies sesyjne i możemy od razu pozwolić na zmianę hasła.

Uwaga dot. wymogu PRD “link ważny 24h”:
- czas ważności linku recovery jest konfigurowany po stronie Supabase (ustawienia Auth), a UI/Backend reaguje na przypadki wygaśnięcia komunikatem `RECOVERY_TOKEN_INVALID`.

### 3.6. Logout

- `UserMenu` wywołuje `POST /api/auth/logout`
- backend czyści cookies (ustawia max-age=0 / expires w przeszłości) i zwraca `{ message: "LOGGED_OUT" }`
- UI redirect do `/login`

### 3.7. Integracja z istniejącymi endpointami `/api/*` (wymóg: nie psuć działania)

Docelowo wszystkie endpointy operujące na danych użytkownika:
- przestają używać hardkodowanego `userId`;
- pobierają `userId` z `locals.auth.userId` (ustawiane w middleware), a jeśli brak:
  - zwracają `401 UNAUTHORIZED` (z `ApiErrorDTO`), co jest już obsługiwane w części hooków (redirecty na `/login`).

W okresie przejściowym (jeśli wymagane, np. w dev):
- można zachować fallback do mocków (jak `GET /api/usage/daily`), ale w produkcji powinno być twarde 401.

---

## Lista planowanych elementów (pliki/moduły – bez implementacji)

### Strony Astro
- `src/pages/login.astro`
- `src/pages/register.astro`
- `src/pages/forgot-password.astro`
- `src/pages/reset-password.astro`
- aktualizacja: `src/pages/app/*.astro` (przejście na `AppLayout.astro`, podanie `userEmail` do `UserMenu`)

### Layouty Astro
- `src/layouts/PublicLayout.astro` (nowy)
- `src/layouts/AppLayout.astro` (nowy)

### Komponenty React
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- aktualizacja: `src/components/dashboard/UserMenu.tsx` (wylogowanie przez API zamiast redirectu “na sztywno”)

### Backend (API routes)
- `src/pages/api/auth/signup.ts`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/logout.ts`
- `src/pages/api/auth/recover.ts`
- `src/pages/api/auth/reset-password.ts`
- `src/pages/api/auth/session.ts` (opcjonalnie)

### Walidacja i narzędzia
- `src/lib/schemas/auth.ts`
- `src/lib/auth/*` (np. `cookies.ts`, `requireUser.ts`, `supabaseAuth.ts`) – pomocnicze moduły do spójnego zarządzania sesją i mapowania błędów.

---

## Kryteria zgodności (Definition of Done na poziomie architektury)

- Spełnione US-001..US-003 w UX i kontraktach API.
- `/app/*` jest chronione; brak sesji → redirect do `/login?next=...`.
- Po rejestracji i logowaniu cookies sesyjne są ustawione, a użytkownik trafia na dashboard.
- `UserMenu` pokazuje prawdziwy email i pozwala się wylogować.
- Endpointy `/api/*` nie używają placeholder `userId`; autoryzacja jest centralna (middleware + `locals`).
- Błędy są spójne (`ApiErrorDTO`), a UI pokazuje czytelne komunikaty.

