# Dokument wymagań produktu (PRD) - SmartWordsAI

## 1. Przegląd produktu

### Nazwa produktu
SmartWordsAI

### Opis produktu
SmartWordsAI to aplikacja do nauki słownictwa obcego, która wykorzystuje sztuczną inteligencję do generowania kontekstowych zdań w języku polskim z użyciem wskazanych słówek angielskich. Użytkownicy tłumaczą te zdania na język angielski, ćwicząc jednocześnie zapamiętywanie słownictwa i jego poprawne użycie w kontekście.

### Główna wartość biznesowa
- Rozwiązuje problem nieefektywnej nauki słownictwa na pamięć
- Zapewnia kontekstowe uczenie się słówek
- Automatyzuje proces tworzenia materiałów do nauki
- Oferuje natychmiastową informację zwrotną

### Grupa docelowa
- Uczniowie uczący się języka angielskiego
- Osoby przygotowujące się do egzaminów językowych
- Nauczyciele języka angielskiego
- Samouki chcące poprawić swoje słownictwo

### Stack technologiczny
- Frontend: React + Astro
- Styling: Tailwind CSS
- Backend: Supabase (Auth + Database)
- AI: Model językowy do generowania zdań

## 2. Problem użytkownika

### Główny problem
Uczniowie uczą się obcych słówek na pamięć, bez kontekstu, co utrudnia zapamiętywanie i poprawne użycie w zdaniach. Tradycyjne metody są mało skuteczne i nie zapewniają zrozumienia, jak słowa funkcjonują w rzeczywistych sytuacjach komunikacyjnych.

### Obecne rozwiązania i ich ograniczenia
- Fiszki: Brak kontekstu, mechaniczne zapamiętywanie
- Listy słówek: Brak praktycznego zastosowania
- Aplikacje do nauki: Często generyczne, bez personalizacji poziomu
- Podręczniki: Statyczne przykłady, brak interaktywności

### Wpływ problemu
- Niska skuteczność nauki słownictwa
- Trudności w praktycznym zastosowaniu poznanych słów
- Frustracja uczniów z powodu braku postępów
- Czasochłonne tworzenie materiałów przez nauczycieli

## 3. Wymagania funkcjonalne

### 3.1 Uwierzytelnianie i autoryzacja
- Rejestracja użytkownika (email + hasło)
- Logowanie użytkownika
- Reset hasła
- Wylogowanie
- Ochrona sesji użytkownika

### 3.2 Zarządzanie zestawami słówek
- Tworzenie nowego zestawu (maksymalnie 20 słówek)
- Wprowadzanie słówek angielskich i ich polskich tłumaczeń
- Wybór poziomu CEFR dla zestawu (A1, A2, B1, B2, C1, C2)
- Edycja istniejących zestawów
- Usuwanie zestawów
- Przeglądanie listy własnych zestawów

### 3.3 Generowanie zdań
- Automatyczne generowanie 2-3 polskich zdań dla każdego słówka
- Dostosowanie długości i złożoności zdań do poziomu CEFR
- Maksymalna długość zdania: 15 słów
- Limit generacji: 10 zestawów dziennie na użytkownika

### 3.4 Ćwiczenia tłumaczeń
- Wyświetlanie polskich zdań do tłumaczenia
- Pole tekstowe do wpisania angielskiego tłumaczenia
- Przycisk "Sprawdź" do weryfikacji odpowiedzi
- System sprawdzania z ignorowaniem kapitalizacji i interpunkcji
- Wymaganie poprawnych artykułów (a, an, the)
- Kolorowe podświetlenie błędów
- Komunikaty wyjaśniające pod zdaniami

### 3.5 Dashboard i nawigacja
- Strona główna z opcjami "Nowy zestaw" i "Moje zestawy"
- Lista zestawów z możliwością wyszukiwania i filtrowania
- Licznik pozostałych generacji dziennych
- Prosta nawigacja między sekcjami

### 3.6 System ocen
- Pojedyncza ocena 1-5 gwiazdek po zakończeniu sesji
- Pytanie: "Czy zdania były jasne i na właściwym poziomie?"
- Opcjonalne komentarze tekstowe

## 4. Granice produktu

### Co NIE wchodzi w zakres MVP
- **Statystyki postępów**: Brak analizy wyników, historii nauki, raportów
- **TTS/Wymowa**: Brak funkcji odtwarzania dźwięku i oceny wymowy
- **Tryby specjalistyczne**: Brak Business English, idiomów, collocations, phrasal verbs
- **Testy interaktywne**: Brak quizów, uzupełniania luk, testów wielokrotnego wyboru
- **Tematy i domeny**: Brak kategoryzacji słówek według tematów
- **Wersjonowanie zestawów**: Brak historii zmian w zestawach
- **Współdzielenie**: Brak możliwości udostępniania zestawów innym użytkownikom
- **Zaawansowane filtry**: Brak zaawansowanego wyszukiwania i sortowania
- **Eksport/Import**: Brak możliwości eksportu danych
- **Tryby offline**: Wymagane połączenie internetowe
- **Wielojęzyczność**: Tylko polski → angielski w MVP

### Ograniczenia techniczne
- Maksymalnie 20 słówek na zestaw
- Limit 10 generacji dziennie na użytkownika
- Brak obsługi plików multimedialnych
- Brak integracji z zewnętrznymi systemami

## 5. Historyjki użytkowników

### US-001: Rejestracja nowego użytkownika
**Tytuł**: Jako nowy użytkownik chcę się zarejestrować, aby móc korzystać z aplikacji

**Opis**: Nowy użytkownik chce utworzyć konto w aplikacji SmartWordsAI, aby móc tworzyć zestawy słówek i ćwiczyć tłumaczenia.

**Kryteria akceptacji**:
- Użytkownik może wprowadzić adres email i hasło
- System waliduje poprawność formatu email
- Hasło musi mieć minimum 8 znaków
- Po rejestracji użytkownik jest automatycznie zalogowany
- Wyświetlany jest komunikat o pomyślnej rejestracji
- Użytkownik zostaje przekierowany do dashboardu

### US-002: Logowanie użytkownika
**Tytuł**: Jako zarejestrowany użytkownik chcę się zalogować, aby uzyskać dostęp do moich zestawów

**Opis**: Zarejestrowany użytkownik chce się zalogować do aplikacji, aby kontynuować naukę.

**Kryteria akceptacji**:
- Użytkownik może wprowadzić email i hasło
- System waliduje dane logowania
- Po pomyślnym logowaniu użytkownik zostaje przekierowany do dashboardu
- W przypadku błędnych danych wyświetlany jest komunikat o błędzie
- Sesja użytkownika jest zachowana

### US-003: Reset hasła
**Tytuł**: Jako użytkownik chcę zresetować hasło, gdy zapomnę go

**Opis**: Użytkownik, który zapomniał hasła, chce je zresetować, aby móc się ponownie zalogować.

**Kryteria akceptacji**:
- Użytkownik może wprowadzić swój email na stronie resetu hasła
- System wysyła link resetujący na podany email
- Link jest aktywny przez 24 godziny
- Użytkownik może ustawić nowe hasło przez link
- Po zmianie hasła użytkownik może się zalogować nowymi danymi

### US-004: Tworzenie nowego zestawu słówek
**Tytuł**: Jako użytkownik chcę utworzyć nowy zestaw słówek, aby móc ćwiczyć tłumaczenia

**Opis**: Zalogowany użytkownik chce utworzyć nowy zestaw słówek do nauki.

**Kryteria akceptacji**:
- Użytkownik może wprowadzić nazwę zestawu
- Użytkownik może dodać do 20 słówek (angielskie + polskie tłumaczenia)
- Użytkownik może wybrać poziom CEFR (A1-C2)
- System waliduje, że wszystkie pola są wypełnione
- Po zapisaniu zestawu użytkownik zostaje przekierowany do listy zestawów
- Zestaw jest widoczny na liście "Moje zestawy"

### US-005: Generowanie zdań dla zestawu
**Tytuł**: Jako użytkownik chcę wygenerować polskie zdania z moimi słówkami, aby móc ćwiczyć tłumaczenia

**Opis**: Użytkownik chce wygenerować polskie zdania zawierające jego słówka, aby móc je tłumaczyć na angielski.

**Kryteria akceptacji**:
- Użytkownik może kliknąć "Generuj zdania" dla wybranego zestawu
- System generuje 2-3 polskie zdania dla każdego słówka
- Długość zdań jest dostosowana do poziomu CEFR (maksymalnie 15 słów)
- Zdania są jasne i na odpowiednim poziomie trudności
- Licznik dziennych generacji zmniejsza się o 1
- Po wygenerowaniu użytkownik może przejść do ćwiczeń

### US-006: Ćwiczenie tłumaczeń
**Tytuł**: Jako użytkownik chcę tłumaczyć polskie zdania na angielski, aby ćwiczyć słownictwo

**Opis**: Użytkownik chce przetłumaczyć wygenerowane polskie zdania na język angielski.

**Kryteria akceptacji**:
- Użytkownik widzi polskie zdanie do tłumaczenia
- Użytkownik może wpisać angielskie tłumaczenie w pole tekstowe
- Użytkownik może kliknąć "Sprawdź" aby zweryfikować odpowiedź
- System sprawdza odpowiedź ignorując kapitalizację i interpunkcję
- System wymaga poprawnych artykułów (a, an, the)
- Błędy są podświetlone kolorem
- Pod zdaniem wyświetlany jest komunikat z wyjaśnieniem błędów
- Użytkownik może przejść do następnego zdania

### US-007: Przeglądanie listy zestawów
**Tytuł**: Jako użytkownik chcę zobaczyć listę moich zestawów, aby móc wybrać który chcę ćwiczyć

**Opis**: Użytkownik chce przeglądać swoje zestawy słówek, aby wybrać odpowiedni do ćwiczeń.

**Kryteria akceptacji**:
- Użytkownik widzi listę wszystkich swoich zestawów
- Każdy zestaw wyświetla nazwę, liczbę słówek i poziom CEFR
- Użytkownik może wyszukiwać zestawy po nazwie
- Użytkownik może filtrować zestawy po poziomie CEFR
- Użytkownik może kliknąć na zestaw, aby go otworzyć
- Lista jest posortowana chronologicznie (najnowsze na górze)

### US-008: Edycja zestawu słówek
**Tytuł**: Jako użytkownik chcę edytować mój zestaw, aby dodać lub usunąć słówka

**Opis**: Użytkownik chce zmodyfikować istniejący zestaw słówek.

**Kryteria akceptacji**:
- Użytkownik może otworzyć zestaw do edycji
- Użytkownik może dodać nowe słówka (do limitu 20)
- Użytkownik może usunąć istniejące słówka
- Użytkownik może zmienić polskie tłumaczenia
- Użytkownik może zmienić poziom CEFR
- Użytkownik może zmienić nazwę zestawu
- Po zapisaniu zmian zestaw jest aktualizowany
- Użytkownik może wygenerować nowe zdania po edycji

### US-009: Usuwanie zestawu
**Tytuł**: Jako użytkownik chcę usunąć zestaw, którego już nie potrzebuję

**Opis**: Użytkownik chce usunąć zestaw słówek, którego już nie potrzebuje.

**Kryteria akceptacji**:
- Użytkownik może kliknąć "Usuń" przy wybranym zestawie
- System wyświetla potwierdzenie usunięcia
- Po potwierdzeniu zestaw zostaje trwale usunięty
- Zestaw znika z listy "Moje zestawy"
- Usunięcie jest nieodwracalne

### US-010: Ocena jakości sesji
**Tytuł**: Jako użytkownik chcę ocenić jakość wygenerowanych zdań, aby pomóc w ulepszeniu aplikacji

**Opis**: Po zakończeniu sesji tłumaczeń użytkownik chce ocenić przydatność wygenerowanych zdań.

**Kryteria akceptacji**:
- Po zakończeniu sesji wyświetlany jest formularz oceny
- Użytkownik może ocenić od 1 do 5 gwiazdek
- Pytanie brzmi: "Czy zdania były jasne i na właściwym poziomie?"
- Użytkownik może dodać opcjonalny komentarz tekstowy
- Ocena jest zapisywana w systemie
- Po ocenie użytkownik może wrócić do dashboardu

### US-011: Sprawdzanie limitu generacji
**Tytuł**: Jako użytkownik chcę wiedzieć ile generacji mi zostało, aby planować naukę

**Opis**: Użytkownik chce monitorować swój dzienny limit generacji zdań.

**Kryteria akceptacji**:
- Użytkownik widzi licznik pozostałych generacji na dashboardzie
- Licznik pokazuje format "X/10 generacji dzisiaj"
- Po osiągnięciu limitu przycisk "Generuj" jest nieaktywny
- Wyświetlany jest komunikat o osiągnięciu limitu
- Limit resetuje się o północy
- Użytkownik może kontynuować ćwiczenia z istniejącymi zestawami

### US-012: Wylogowanie z aplikacji
**Tytuł**: Jako użytkownik chcę się wylogować, aby zabezpieczyć moje konto

**Opis**: Użytkownik chce bezpiecznie wylogować się z aplikacji.

**Kryteria akceptacji**:
- Użytkownik może kliknąć "Wyloguj" w menu
- Po wylogowaniu sesja zostaje zakończona
- Użytkownik zostaje przekierowany na stronę logowania
- Dostęp do chronionych funkcji jest zablokowany
- Przy ponownym logowaniu wymagane jest ponowne wprowadzenie danych

## 6. Metryki sukcesu

### 6.1 Metryki użyteczności

#### Czas do pierwszego sprawdzenia
- **Cel**: ≥85% nowych użytkowników tworzy pierwszy zestaw, generuje zdania i klika "Sprawdź" w ≤15 minut
- **Pomiar**: Czas mierzony od kliknięcia "Utwórz zestaw" do pierwszego kliknięcia "Sprawdź"
- **Metoda**: Automatyczne logowanie timestampów w bazie danych
- **Częstotliwość**: Codziennie dla nowych użytkowników

#### Wskaźnik konwersji onboarding
- **Cel**: ≥85% użytkowników kończy pełny cykl: rejestracja → zestaw → generacja → sprawdzenie
- **Pomiar**: Procent użytkowników, którzy wykonają wszystkie kroki w pierwszej sesji
- **Metoda**: Śledzenie kroków w procesie onboarding
- **Częstotliwość**: Codziennie

### 6.2 Metryki jakości

#### Ocena przydatności zdań
- **Cel**: Średnia ocena użytkowników "Czy zdania były jasne i na właściwym poziomie?" ≥4/5
- **Pomiar**: Średnia ocena 1-5 gwiazdek po każdej sesji
- **Metoda**: Formularz oceny po zakończeniu sesji
- **Częstotliwość**: Po każdej sesji tłumaczeń

#### Wskaźnik retencji
- **Cel**: ≥60% użytkowników wraca do aplikacji w ciągu 7 dni
- **Pomiar**: Procent użytkowników aktywnych w ciągu tygodnia
- **Metoda**: Śledzenie logowań w bazie danych
- **Częstotliwość**: Tygodniowo

### 6.3 Metryki techniczne

#### Czas odpowiedzi systemu
- **Cel**: Generowanie zdań w ≤30 sekund
- **Pomiar**: Czas od kliknięcia "Generuj" do wyświetlenia zdań
- **Metoda**: Monitoring API calls
- **Częstotliwość**: Ciągłe

#### Dostępność systemu
- **Cel**: ≥99% uptime
- **Pomiar**: Procent czasu, gdy aplikacja jest dostępna
- **Metoda**: Monitoring infrastruktury
- **Częstotliwość**: Ciągłe

### 6.4 Metryki biznesowe

#### Aktywne użycie
- **Cel**: ≥70% zarejestrowanych użytkowników jest aktywnych miesięcznie
- **Pomiar**: Procent użytkowników logujących się co najmniej raz w miesiącu
- **Metoda**: Analiza logów aktywności
- **Częstotliwość**: Miesięcznie

#### Wykorzystanie limitu generacji
- **Cel**: ≥30% użytkowników wykorzystuje ≥5 generacji tygodniowo
- **Pomiar**: Procent użytkowników aktywnie korzystających z funkcji generowania
- **Metoda**: Śledzenie wykorzystania limitu dziennego
- **Częstotliwość**: Tygodniowo

### 6.5 Metryki jakości treści

#### Dokładność sprawdzania
- **Cel**: ≥90% poprawnych identyfikacji błędów w odpowiedziach użytkowników
- **Pomiar**: Procent poprawnie zidentyfikowanych błędów vs. fałszywych alarmów
- **Metoda**: Ręczna weryfikacja próbki odpowiedzi
- **Częstotliwość**: Tygodniowo

#### Różnorodność generowanych zdań
- **Cel**: ≥80% unikalnych wzorców zdań dla tego samego słówka
- **Pomiar**: Procent unikalnych struktur zdań w generowanych przykładach
- **Metoda**: Analiza lingwistyczna wygenerowanych treści
- **Częstotliwość**: Miesięcznie