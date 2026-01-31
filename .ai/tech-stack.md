Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testowanie:
- Testy jednostkowe i integracyjne - Vitest:
  - Framework kompatybilny z Vite używanym przez Astro
  - Wersja ^2.0.0
  - vi.mock() do mockowania klientów Supabase i OpenRouter
  - Pokrycie kodu (coverage): cel ≥80% dla plików src/lib/services/**/*.ts
  - Używany do testowania funkcji pomocniczych, schematów walidacji Zod, serwisów biznesowych, mapperów błędów
  - Testy integracyjne API endpoints z Supertest (HTTP assertions)
- Testy end-to-end - Playwright:
  - Wersja ^1.48.0
  - Wspiera SSR i React islands
  - Cross-browser: Chromium, Firefox, WebKit
  - Page Object Model (POM) dla lepszej struktury testów
  - Używany do testowania pełnych przepływów użytkownika (user journeys) i interakcji frontend-backend

CI/CD i Hosting:
- Github Actions do tworzenia pipeline’ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker