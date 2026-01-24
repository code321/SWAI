# Plan Wdrożenia Usługi OpenRouter

## 1. Opis Usługi

Usługa OpenRouter jest klasą serwisową odpowiedzialną za komunikację z interfejsem API OpenRouter.ai w celu generowania zdań w języku polskim na podstawie słów angielskich. Usługa abstrahuje szczegóły komunikacji z API, zapewnia obsługę błędów, walidację odpowiedzi oraz wsparcie dla ustrukturyzowanych odpowiedzi poprzez JSON Schema.

### Główne funkcjonalności:
- Wysyłanie żądań do OpenRouter API z konfigurowalnymi parametrami modelu
- Obsługa komunikatów systemowych i użytkownika
- Wymuszanie ustrukturyzowanych odpowiedzi poprzez `response_format` z JSON Schema
- Walidacja odpowiedzi zgodnie z zdefiniowanym schematem
- Obsługa błędów API z odpowiednimi kodami i komunikatami
- Logowanie metryk użycia (tokens, koszty)

### Kontekst użycia:
Usługa będzie wykorzystywana w funkcji `triggerGeneration` w `src/lib/services/generation/triggerGeneration.ts` do generowania zdań polskich dla słów angielskich z zestawu słownictwa.

---

## 2. Opis Konstruktora

### `OpenRouterService`

```typescript
constructor(config: OpenRouterServiceConfig)
```

**Parametry:**
- `config.apiKey: string` - Klucz API OpenRouter (wymagany)
- `config.baseUrl?: string` - Bazowy URL API (opcjonalny, domyślnie: `https://openrouter.ai/api/v1`)
- `config.defaultModel?: string` - Domyślny model do użycia (opcjonalny)
- `config.timeout?: number` - Timeout żądania w milisekundach (opcjonalny, domyślnie: 30000)
- `config.maxRetries?: number` - Maksymalna liczba ponownych prób (opcjonalny, domyślnie: 3)

**Zachowanie:**
- Waliduje obecność `apiKey` - rzuca błąd, jeśli brak
- Inicjalizuje wewnętrzne pola z wartościami domyślnymi
- Przygotowuje konfigurację HTTP clienta

**Przykład użycia:**
```typescript
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4o',
  timeout: 60000,
  maxRetries: 2
});
```

---

## 3. Publiczne Metody i Pola

### 3.1. `generateSentences(request: GenerateSentencesRequest): Promise<GenerateSentencesResponse>`

Główna metoda do generowania zdań. Wysyła żądanie do OpenRouter API z odpowiednio skonfigurowanymi komunikatami, parametrami modelu i schematem odpowiedzi.

**Parametry:**
```typescript
interface GenerateSentencesRequest {
  words: Array<{ pl: string; en: string }>;
  modelId: string;
  temperature?: number;
  systemMessage?: string;
  promptVersion: string;
}
```

**Zwraca:**
```typescript
interface GenerateSentencesResponse {
  sentences: Array<{
    word_id?: string;
    pl_text: string;
    target_en: string;
  }>;
  usage: {
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  };
}
```

**Zachowanie:**
1. Buduje komunikat systemowy (domyślny lub niestandardowy)
2. Buduje komunikat użytkownika z listą słów
3. Konfiguruje `response_format` z JSON Schema dla ustrukturyzowanej odpowiedzi
4. Wysyła żądanie do API z retry logic
5. Waliduje odpowiedź zgodnie ze schematem
6. Mapuje odpowiedź do formatu zwracanego przez metodę
7. Oblicza koszty na podstawie metryk użycia

**Przykład użycia:**
```typescript
const response = await service.generateSentences({
  words: [
    { pl: 'kot', en: 'cat' },
    { pl: 'pies', en: 'dog' }
  ],
  modelId: 'openai/gpt-4o',
  temperature: 0.7,
  promptVersion: 'v1.0.0'
});
```

### 3.2. `validateModel(modelId: string): Promise<boolean>`

Weryfikuje, czy model obsługuje wymagane funkcje (strukturyzowane odpowiedzi).

**Parametry:**
- `modelId: string` - Identyfikator modelu w formacie `provider/model-name`

**Zwraca:**
- `Promise<boolean>` - `true` jeśli model jest obsługiwany, `false` w przeciwnym razie

**Zachowanie:**
- Sprawdza listę obsługiwanych modeli (może być cache'owana)
- Weryfikuje format identyfikatora modelu

### 3.3. `getUsageStats(): UsageStats`

Zwraca statystyki użycia usługi (łączne tokeny, koszty) od momentu inicjalizacji.

**Zwraca:**
```typescript
interface UsageStats {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  requestCount: number;
}
```

---

## 4. Prywatne Metody i Pola

### 4.1. Pola prywatne

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly defaultModel: string | undefined;
private readonly timeout: number;
private readonly maxRetries: number;
private usageStats: UsageStats;
```

### 4.2. `buildSystemMessage(customMessage?: string): string`

Buduje komunikat systemowy dla modelu.

**Parametry:**
- `customMessage?: string` - Opcjonalny niestandardowy komunikat systemowy

**Zwraca:**
- `string` - Komunikat systemowy

**Zachowanie:**
- Jeśli podano `customMessage`, używa go
- W przeciwnym razie używa domyślnego komunikatu systemowego zdefiniowanego w klasie
- Domyślny komunikat instruuje model, aby generował krótkie, naturalne zdania polskie z odpowiednimi słowami angielskimi

**Przykład domyślnego komunikatu:**
```typescript
private readonly DEFAULT_SYSTEM_MESSAGE = `Jesteś pomocnym asystentem do nauki języka angielskiego. 
Twoim zadaniem jest generowanie krótkich, naturalnych zdań w języku polskim, 
które zawierają podane słowa angielskie. Zdania powinny być:
- Krótkie (maksymalnie 10-15 słów)
- Naturalne i zrozumiałe
- Odpowiednie dla poziomu CEFR A1
- Zawierające dokładnie jedno słowo angielskie z listy`;
```

### 4.3. `buildUserMessage(words: Array<{ pl: string; en: string }>): string`

Buduje komunikat użytkownika zawierający listę słów do użycia w generowaniu zdań.

**Parametry:**
- `words: Array<{ pl: string; en: string }>` - Lista słów z tłumaczeniami

**Zwraca:**
- `string` - Sformatowany komunikat użytkownika

**Zachowanie:**
- Formatuje listę słów w czytelny sposób
- Każde słowo prezentowane jako para `angielskie (polskie)`
- Dodaje instrukcje dotyczące generowania zdań

**Przykład:**
```typescript
// Input:
words = [{ pl: 'kot', en: 'cat' }, { pl: 'pies', en: 'dog' }]

// Output:
"Wygeneruj zdania w języku polskim używając następujących słów angielskich:
1. cat (kot)
2. dog (pies)

Dla każdego słowa wygeneruj jedno zdanie polskie, które naturalnie zawiera to słowo angielskie."
```

### 4.4. `buildResponseFormat(): ResponseFormat`

Buduje obiekt `response_format` z JSON Schema dla ustrukturyzowanych odpowiedzi.

**Zwraca:**
```typescript
interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema;
  };
}
```

**Zachowanie:**
- Definiuje schemat JSON zgodny z oczekiwaną strukturą odpowiedzi
- Ustawia `strict: true` dla wymuszenia dokładnego przestrzegania schematu
- Nazwa schematu: `"sentence_generation_response"`

**Przykład schematu:**
```typescript
{
  type: 'json_schema',
  json_schema: {
    name: 'sentence_generation_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sentences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pl_text: {
                type: 'string',
                description: 'Zdanie w języku polskim zawierające słowo angielskie'
              },
              target_en: {
                type: 'string',
                description: 'Słowo angielskie użyte w zdaniu'
              }
            },
            required: ['pl_text', 'target_en'],
            additionalProperties: false
          }
        }
      },
      required: ['sentences'],
      additionalProperties: false
    }
  }
}
```

### 4.5. `buildRequestPayload(request: GenerateSentencesRequest): OpenRouterRequest`

Buduje pełne żądanie do OpenRouter API.

**Parametry:**
- `request: GenerateSentencesRequest` - Parametry żądania

**Zwraca:**
```typescript
interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user';
    content: string;
  }>;
  temperature?: number;
  response_format: ResponseFormat;
  extra_headers?: Record<string, string>;
}
```

**Zachowanie:**
- Łączy wszystkie elementy: model, komunikaty, parametry, response_format
- Używa `modelId` z żądania lub domyślnego modelu
- Buduje tablicę komunikatów z systemowym i użytkownika
- Dodaje `response_format` z JSON Schema

### 4.6. `sendRequest(payload: OpenRouterRequest): Promise<OpenRouterResponse>`

Wysyła żądanie HTTP do OpenRouter API z obsługą retry.

**Parametry:**
- `payload: OpenRouterRequest` - Payload żądania

**Zwraca:**
```typescript
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}
```

**Zachowanie:**
1. Wysyła żądanie POST do `${baseUrl}/chat/completions`
2. Dodaje nagłówki: `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`
3. Implementuje retry logic z exponential backoff
4. Obsługuje timeout
5. Parsuje odpowiedź JSON
6. Aktualizuje statystyki użycia

**Przykład implementacji retry:**
```typescript
private async sendRequestWithRetry(
  payload: OpenRouterRequest,
  attempt: number = 1
): Promise<OpenRouterResponse> {
  try {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://smartwordsai.app', // Opcjonalnie
        'X-Title': 'SmartWordsAI' // Opcjonalnie
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      if (this.shouldRetry(error, attempt)) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return this.sendRequestWithRetry(payload, attempt + 1);
      }
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (this.shouldRetry(error, attempt)) {
      await this.delay(Math.pow(2, attempt) * 1000);
      return this.sendRequestWithRetry(payload, attempt + 1);
    }
    throw error;
  }
}
```

### 4.7. `parseResponse(response: OpenRouterResponse): GenerateSentencesResponse`

Parsuje odpowiedź z OpenRouter API i waliduje ją zgodnie ze schematem.

**Parametry:**
- `response: OpenRouterResponse` - Odpowiedź z API

**Zwraca:**
- `GenerateSentencesResponse` - Zwalidowana i zmapowana odpowiedź

**Zachowanie:**
1. Wyodrębnia zawartość z `choices[0].message.content`
2. Parsuje JSON z zawartości
3. Waliduje strukturę zgodnie z JSON Schema używając Zod
4. Mapuje do formatu zwracanego przez metodę
5. Oblicza koszty na podstawie `usage` i cennika modelu

**Walidacja z Zod:**
```typescript
const responseSchema = z.object({
  sentences: z.array(
    z.object({
      pl_text: z.string().min(1),
      target_en: z.string().min(1)
    })
  )
});

const validated = responseSchema.parse(parsedContent);
```

### 4.8. `calculateCost(usage: Usage, modelId: string): number`

Oblicza koszt żądania na podstawie użycia tokenów i cennika modelu.

**Parametry:**
- `usage: { prompt_tokens: number; completion_tokens: number }` - Metryki użycia
- `modelId: string` - Identyfikator modelu

**Zwraca:**
- `number` - Koszt w USD

**Zachowanie:**
- Pobiera cennik modelu (może być cache'owany lub z konfiguracji)
- Oblicza: `(prompt_tokens * input_price_per_1k) / 1000 + (completion_tokens * output_price_per_1k) / 1000`
- Zwraca zaokrągloną wartość do 6 miejsc po przecinku

### 4.9. `parseErrorResponse(response: Response): Promise<OpenRouterError>`

Parsuje odpowiedź błędu z API i tworzy odpowiedni obiekt błędu.

**Parametry:**
- `response: Response` - Odpowiedź HTTP z błędem

**Zwraca:**
- `Promise<OpenRouterError>` - Zstrukturyzowany błąd

**Zachowanie:**
- Próbuje sparsować JSON z odpowiedzi
- Mapuje kody statusu HTTP do kodów błędów OpenRouter
- Wyodrębnia komunikat błędu z odpowiedzi API

### 4.10. `shouldRetry(error: Error, attempt: number): boolean`

Określa, czy należy ponowić żądanie w przypadku błędu.

**Parametry:**
- `error: Error` - Błąd, który wystąpił
- `attempt: number` - Numer aktualnej próby

**Zwraca:**
- `boolean` - `true` jeśli należy ponowić, `false` w przeciwnym razie

**Zachowanie:**
- Nie ponawia, jeśli przekroczono `maxRetries`
- Ponawia dla błędów sieciowych (timeout, connection error)
- Ponawia dla błędów 5xx (server errors)
- Nie ponawia dla błędów 4xx (client errors) z wyjątkiem 429 (rate limit)

### 4.11. `delay(ms: number): Promise<void>`

Pomocnicza metoda do opóźnienia (używana w retry logic).

**Parametry:**
- `ms: number` - Liczba milisekund do opóźnienia

**Zwraca:**
- `Promise<void>`

---

## 5. Obsługa Błędów

### 5.1. Scenariusze błędów i ich obsługa

#### 5.1.1. Błędy konfiguracji

**Scenariusz:** Brak klucza API w konstruktorze
- **Kod błędu:** `OPENROUTER_CONFIG_ERROR`
- **Komunikat:** `"OpenRouter API key is required"`
- **Obsługa:** Rzucanie błędu podczas inicjalizacji

**Scenariusz:** Nieprawidłowy format modelu
- **Kod błędu:** `INVALID_MODEL_ID`
- **Komunikat:** `"Model ID must follow format: provider/model-name"`
- **Obsługa:** Walidacja w metodzie `generateSentences`

#### 5.1.2. Błędy sieciowe

**Scenariusz:** Timeout żądania
- **Kod błędu:** `OPENROUTER_TIMEOUT`
- **Komunikat:** `"Request to OpenRouter API timed out"`
- **Obsługa:** Retry z exponential backoff (maksymalnie `maxRetries` razy)

**Scenariusz:** Brak połączenia z siecią
- **Kod błędu:** `OPENROUTER_NETWORK_ERROR`
- **Komunikat:** `"Network error while connecting to OpenRouter API"`
- **Obsługa:** Retry z exponential backoff

#### 5.1.3. Błędy autoryzacji

**Scenariusz:** Nieprawidłowy klucz API
- **Kod błędu:** `OPENROUTER_AUTH_ERROR`
- **Komunikat:** `"Invalid OpenRouter API key"`
- **Obsługa:** Brak retry, natychmiastowe rzucenie błędu

**Scenariusz:** Wygaśnięty klucz API
- **Kod błędu:** `OPENROUTER_AUTH_ERROR`
- **Komunikat:** `"OpenRouter API key has expired"`
- **Obsługa:** Brak retry, natychmiastowe rzucenie błędu

#### 5.1.4. Błędy limitu

**Scenariusz:** Przekroczony limit rate
- **Kod błędu:** `OPENROUTER_RATE_LIMIT`
- **Komunikat:** `"Rate limit exceeded. Please try again later"`
- **Obsługa:** Retry z dłuższym opóźnieniem (exponential backoff)

**Scenariusz:** Przekroczony budżet
- **Kod błędu:** `OPENROUTER_BUDGET_EXCEEDED`
- **Komunikat:** `"OpenRouter budget limit has been exceeded"`
- **Obsługa:** Brak retry, natychmiastowe rzucenie błędu

#### 5.1.5. Błędy walidacji

**Scenariusz:** Nieprawidłowa struktura odpowiedzi
- **Kod błędu:** `OPENROUTER_INVALID_RESPONSE`
- **Komunikat:** `"Response from OpenRouter API does not match expected schema"`
- **Obsługa:** Logowanie szczegółów błędu, rzucenie błędu z informacją o walidacji

**Scenariusz:** Model nie obsługuje structured outputs
- **Kod błędu:** `OPENROUTER_UNSUPPORTED_FEATURE`
- **Komunikat:** `"Model does not support structured outputs with JSON Schema"`
- **Obsługa:** Weryfikacja przed wysłaniem żądania (jeśli możliwe)

#### 5.1.6. Błędy serwera

**Scenariusz:** Błąd 500 z OpenRouter
- **Kod błędu:** `OPENROUTER_SERVER_ERROR`
- **Komunikat:** `"OpenRouter API returned a server error"`
- **Obsługa:** Retry z exponential backoff

**Scenariusz:** Błąd 503 (Service Unavailable)
- **Kod błędu:** `OPENROUTER_SERVICE_UNAVAILABLE`
- **Komunikat:** `"OpenRouter API is temporarily unavailable"`
- **Obsługa:** Retry z exponential backoff

#### 5.1.7. Błędy parsowania

**Scenariusz:** Nieprawidłowy JSON w odpowiedzi
- **Kod błędu:** `OPENROUTER_PARSE_ERROR`
- **Komunikat:** `"Failed to parse response from OpenRouter API"`
- **Obsługa:** Logowanie surowej odpowiedzi do debugowania, rzucenie błędu

**Scenariusz:** Pusta odpowiedź
- **Kod błędu:** `OPENROUTER_EMPTY_RESPONSE`
- **Komunikat:** `"OpenRouter API returned an empty response"`
- **Obsługa:** Rzucenie błędu z informacją o braku danych

### 5.2. Klasa błędu OpenRouter

```typescript
export class OpenRouterError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}
```

### 5.3. Mapowanie kodów statusu HTTP do kodów błędów

```typescript
private mapStatusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 401:
      return 'OPENROUTER_AUTH_ERROR';
    case 403:
      return 'OPENROUTER_AUTH_ERROR';
    case 429:
      return 'OPENROUTER_RATE_LIMIT';
    case 500:
    case 502:
    case 503:
      return 'OPENROUTER_SERVER_ERROR';
    case 400:
      return 'OPENROUTER_INVALID_REQUEST';
    default:
      return 'OPENROUTER_UNKNOWN_ERROR';
  }
}
```

---

## 6. Kwestie Bezpieczeństwa

### 6.1. Przechowywanie klucza API

- **Nigdy nie commituj klucza API do repozytorium**
- Używaj zmiennych środowiskowych (`import.meta.env.OPENROUTER_API_KEY`)
- Waliduj obecność klucza podczas inicjalizacji usługi
- Rozważ użycie Supabase Vault lub podobnego rozwiązania do przechowywania sekretów w produkcji

### 6.2. Bezpieczna komunikacja

- Używaj tylko HTTPS do komunikacji z OpenRouter API
- Weryfikuj certyfikaty SSL (domyślnie w `fetch`)
- Nie loguj pełnych żądań i odpowiedzi zawierających wrażliwe dane

### 6.3. Walidacja danych wejściowych

- Waliduj wszystkie dane wejściowe przed wysłaniem do API
- Używaj Zod do walidacji schematów
- Ogranicz długość komunikatów systemowych i użytkownika
- Sanityzuj dane wejściowe (usuwanie potencjalnie niebezpiecznych znaków)

### 6.4. Rate limiting i budżet

- Implementuj rate limiting po stronie aplikacji
- Monitoruj użycie tokenów i koszty
- Ustaw limity budżetowe w OpenRouter dashboard
- Alertuj o zbliżaniu się do limitów

### 6.5. Obsługa błędów bez ujawniania szczegółów

- Nie ujawniaj szczegółów błędów wewnętrznych użytkownikom końcowym
- Loguj pełne szczegóły błędów tylko w trybie deweloperskim
- Zwracaj ogólne komunikaty błędów w odpowiedziach API

### 6.6. Timeout i retry

- Ustaw rozsądne timeouty (domyślnie 30s, konfigurowalne)
- Ogranicz liczbę ponownych prób, aby uniknąć niepotrzebnych kosztów
- Implementuj exponential backoff, aby nie przeciążać API

### 6.7. Walidacja odpowiedzi

- Zawsze waliduj odpowiedzi z API przed użyciem
- Używaj strict mode w JSON Schema dla wymuszenia dokładnej struktury
- Odrzucaj nieprawidłowe odpowiedzi zamiast próbować je naprawiać

---

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Przygotowanie struktury plików

1. Utwórz folder `src/lib/services/openrouter/`
2. Utwórz plik `src/lib/services/openrouter/OpenRouterService.ts` - główna klasa serwisu
3. Utwórz plik `src/lib/services/openrouter/types.ts` - definicje typów i interfejsów
4. Utwórz plik `src/lib/services/openrouter/errors.ts` - klasy błędów
5. Utwórz plik `src/lib/services/openrouter/schemas.ts` - schematy Zod do walidacji
6. Utwórz plik `src/lib/services/openrouter/index.ts` - eksporty publiczne

### Krok 2: Definicja typów i interfejsów

1. W `types.ts` zdefiniuj:
   - `OpenRouterServiceConfig` - konfiguracja konstruktora
   - `GenerateSentencesRequest` - parametry żądania generowania
   - `GenerateSentencesResponse` - odpowiedź z generowania
   - `OpenRouterRequest` - pełne żądanie do API
   - `OpenRouterResponse` - odpowiedź z API
   - `ResponseFormat` - format odpowiedzi z JSON Schema
   - `UsageStats` - statystyki użycia
   - `Usage` - metryki użycia tokenów

2. Użyj istniejących typów z `src/types.ts` gdzie to możliwe

### Krok 3: Implementacja klas błędów

1. W `errors.ts` zaimplementuj:
   - Klasę `OpenRouterError` rozszerzającą `Error`
   - Funkcje pomocnicze do tworzenia konkretnych błędów
   - Mapowanie kodów statusu HTTP do kodów błędów

### Krok 4: Implementacja schematów walidacji

1. W `schemas.ts` zdefiniuj schematy Zod:
   - `openRouterResponseSchema` - walidacja odpowiedzi z API
   - `sentenceGenerationResponseSchema` - walidacja struktury zdań
   - `usageSchema` - walidacja metryk użycia

2. Użyj schematów do walidacji odpowiedzi w metodzie `parseResponse`

### Krok 5: Implementacja konstruktora

1. W `OpenRouterService.ts`:
   - Zaimplementuj konstruktor z walidacją `apiKey`
   - Ustaw wartości domyślne dla opcjonalnych parametrów
   - Zainicjalizuj `usageStats` z zerowymi wartościami
   - Zdefiniuj domyślny komunikat systemowy jako stałą prywatną

**Przykład:**
```typescript
constructor(config: OpenRouterServiceConfig) {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new OpenRouterError(
      'OPENROUTER_CONFIG_ERROR',
      'OpenRouter API key is required'
    );
  }

  this.apiKey = config.apiKey;
  this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
  this.defaultModel = config.defaultModel;
  this.timeout = config.timeout ?? 30000;
  this.maxRetries = config.maxRetries ?? 3;
  this.usageStats = {
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalCostUsd: 0,
    requestCount: 0
  };
}
```

### Krok 6: Implementacja metod pomocniczych (prywatnych)

1. **`buildSystemMessage`**:
   - Zwróć `customMessage` jeśli podano
   - W przeciwnym razie zwróć domyślny komunikat systemowy
   - Komunikat powinien instruować model o generowaniu zdań polskich

2. **`buildUserMessage`**:
   - Przyjmij tablicę słów `{ pl, en }`
   - Sformatuj listę słów w czytelny sposób
   - Dodaj instrukcje dotyczące generowania zdań

3. **`buildResponseFormat`**:
   - Zdefiniuj JSON Schema dla odpowiedzi z tablicą zdań
   - Każde zdanie powinno mieć `pl_text` i `target_en`
   - Ustaw `strict: true` i `name: 'sentence_generation_response'`
   - Zwróć obiekt `ResponseFormat`

4. **`buildRequestPayload`**:
   - Połącz wszystkie elementy: model, messages, temperature, response_format
   - Użyj `buildSystemMessage` i `buildUserMessage`
   - Dodaj `buildResponseFormat` do payloadu

5. **`sendRequest`**:
   - Zaimplementuj `sendRequestWithRetry` z exponential backoff
   - Użyj `fetch` z odpowiednimi nagłówkami
   - Obsłuż timeout używając `AbortSignal.timeout`
   - Parsuj odpowiedź JSON
   - Aktualizuj `usageStats`

6. **`parseResponse`**:
   - Wyodrębnij `content` z `choices[0].message.content`
   - Parsuj JSON
   - Waliduj używając schematu Zod
   - Mapuj do `GenerateSentencesResponse`
   - Wyodrębnij `usage` z odpowiedzi API

7. **`calculateCost`**:
   - Zaimplementuj prostą funkcję obliczającą koszt
   - Dla MVP możesz użyć stałych wartości lub prostego mapowania modeli do cen
   - W przyszłości można pobierać ceny z OpenRouter API

8. **`parseErrorResponse`**:
   - Spróbuj sparsować JSON z odpowiedzi błędu
   - Mapuj kod statusu HTTP do kodu błędu
   - Wyodrębnij komunikat błędu

9. **`shouldRetry`**:
   - Sprawdź, czy nie przekroczono `maxRetries`
   - Zwróć `true` dla błędów sieciowych i 5xx
   - Zwróć `true` dla 429 (rate limit)
   - Zwróć `false` dla 4xx (z wyjątkiem 429)

10. **`delay`**:
    - Prosta implementacja `setTimeout` w Promise

### Krok 7: Implementacja publicznej metody `generateSentences`

1. Waliduj parametry wejściowe (modelId format, words niepuste)
2. Wywołaj `buildRequestPayload` do zbudowania żądania
3. Wywołaj `sendRequest` do wysłania żądania
4. Wywołaj `parseResponse` do parsowania i walidacji odpowiedzi
5. Oblicz koszt używając `calculateCost`
6. Zaktualizuj `usageStats`
7. Zwróć `GenerateSentencesResponse`

**Przykład struktury:**
```typescript
async generateSentences(
  request: GenerateSentencesRequest
): Promise<GenerateSentencesResponse> {
  // Walidacja
  if (!request.words || request.words.length === 0) {
    throw new OpenRouterError(
      'INVALID_REQUEST',
      'Words array cannot be empty'
    );
  }

  if (!/^[\w-]+\/[\w.-]+$/.test(request.modelId)) {
    throw new OpenRouterError(
      'INVALID_MODEL_ID',
      'Model ID must follow format: provider/model-name'
    );
  }

  // Budowanie żądania
  const payload = this.buildRequestPayload(request);

  // Wysyłanie żądania
  const apiResponse = await this.sendRequest(payload);

  // Parsowanie odpowiedzi
  const parsed = this.parseResponse(apiResponse);

  // Obliczanie kosztu
  const cost = this.calculateCost(apiResponse.usage, request.modelId);

  // Aktualizacja statystyk
  this.usageStats.totalTokensIn += apiResponse.usage.prompt_tokens;
  this.usageStats.totalTokensOut += apiResponse.usage.completion_tokens;
  this.usageStats.totalCostUsd += cost;
  this.usageStats.requestCount += 1;

  // Zwracanie odpowiedzi z kosztem
  return {
    ...parsed,
    usage: {
      ...parsed.usage,
      cost_usd: cost
    }
  };
}
```

### Krok 8: Implementacja pozostałych metod publicznych

1. **`validateModel`**:
   - Dla MVP zwróć `true` dla znanych modeli (można rozszerzyć później)
   - Waliduj format `modelId`

2. **`getUsageStats`**:
   - Zwróć kopię `usageStats`

### Krok 9: Integracja z `triggerGeneration`

1. W `src/lib/services/generation/triggerGeneration.ts`:
   - Zaimportuj `OpenRouterService`
   - Utwórz instancję serwisu w funkcji (lub przekaż jako parametr)
   - Zastąp TODO w kroku 8 wywołaniem `generateSentences`
   - Zmapuj odpowiedź do formatu wymaganego przez funkcję
   - Zaktualizuj `tokens_in`, `tokens_out`, `cost_usd` w `generation_runs`

**Przykład integracji:**
```typescript
// W triggerGeneration.ts, po utworzeniu generation_run:

// Step 8: Call OpenRouter to generate sentences
const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: command.model_id,
  timeout: 60000
});

const generationResponse = await openRouterService.generateSentences({
  words: wordsSnapshot,
  modelId: command.model_id,
  temperature: command.temperature,
  promptVersion: command.prompt_version
});

// Mapowanie odpowiedzi do formatu sentences
const sentencesToInsert = generationResponse.sentences.map((sentence, index) => ({
  generation_id: generationRun.id,
  word_id: words[index].id, // Mapowanie na podstawie kolejności
  pl_text: sentence.pl_text,
  target_en: sentence.target_en,
}));

// Aktualizacja generation_run z metrykami
await supabase
  .from('generation_runs')
  .update({
    tokens_in: generationResponse.usage.tokens_in,
    tokens_out: generationResponse.usage.tokens_out,
    cost_usd: generationResponse.usage.cost_usd
  })
  .eq('id', generationRun.id);
```

### Krok 11: Eksporty

1. W `index.ts` wyeksportuj:
   - `OpenRouterService` jako domyślny eksport
   - `OpenRouterError` i inne klasy błędów
   - Typy publiczne (interfejsy)


### Krok 12: Aktualizacja zmiennych środowiskowych

1. Upewnij się, że `OPENROUTER_API_KEY` jest zdefiniowany w `.env.example`
2. Dodaj instrukcje w README dotyczące konfiguracji klucza API

### Krok 13: Code review i refaktoryzacja

1. Przejrzyj kod pod kątem:
   - Zgodności z zasadami projektu (early returns, guard clauses)
   - Obsługi błędów
   - Czytelności i maintainability
   - Wydajności

2. Uruchom linter i napraw wszystkie błędy

### Krok 14: Integracja końcowa

1. Zaktualizuj `triggerGeneration` z pełną integracją

---

## 8. Przykłady Użycia

### 8.1. Podstawowe użycie

```typescript
import { OpenRouterService } from '@/lib/services/openrouter';

const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4o',
  timeout: 60000
});

const response = await service.generateSentences({
  words: [
    { pl: 'kot', en: 'cat' },
    { pl: 'pies', en: 'dog' },
    { pl: 'dom', en: 'house' }
  ],
  modelId: 'openai/gpt-4o',
  temperature: 0.7,
  promptVersion: 'v1.0.0'
});

console.log(response.sentences);
// [
//   { pl_text: 'Mój kot śpi na kanapie.', target_en: 'cat' },
//   { pl_text: 'Pies biega po ogrodzie.', target_en: 'dog' },
//   { pl_text: 'Dom jest duży i piękny.', target_en: 'house' }
// ]

console.log(response.usage);
// {
//   tokens_in: 150,
//   tokens_out: 45,
//   cost_usd: 0.0012,
//   remaining_generations_today: 9
// }
```

### 8.2. Z niestandardowym komunikatem systemowym

```typescript
const response = await service.generateSentences({
  words: [{ pl: 'kot', en: 'cat' }],
  modelId: 'openai/gpt-4o',
  temperature: 0.7,
  promptVersion: 'v1.0.0',
  systemMessage: 'Jesteś ekspertem od nauki języków. Generuj bardzo proste zdania dla początkujących.'
});
```

### 8.3. Obsługa błędów

```typescript
try {
  const response = await service.generateSentences({
    words: [{ pl: 'kot', en: 'cat' }],
    modelId: 'openai/gpt-4o',
    temperature: 0.7,
    promptVersion: 'v1.0.0'
  });
} catch (error) {
  if (error instanceof OpenRouterError) {
    switch (error.code) {
      case 'OPENROUTER_AUTH_ERROR':
        console.error('Problem z autoryzacją:', error.message);
        break;
      case 'OPENROUTER_RATE_LIMIT':
        console.error('Przekroczono limit:', error.message);
        break;
      case 'OPENROUTER_TIMEOUT':
        console.error('Timeout:', error.message);
        break;
      default:
        console.error('Błąd OpenRouter:', error.message);
    }
  } else {
    console.error('Nieoczekiwany błąd:', error);
  }
}
```

### 8.4. Sprawdzanie statystyk użycia

```typescript
const stats = service.getUsageStats();
console.log(`Wykonano ${stats.requestCount} żądań`);
console.log(`Użyto ${stats.totalTokensIn + stats.totalTokensOut} tokenów`);
console.log(`Koszt: $${stats.totalCostUsd.toFixed(6)}`);
```

---

## 9. Uwagi Implementacyjne

### 9.1. JSON Schema dla response_format

Schemat musi być dokładnie zgodny z formatem wymaganym przez OpenRouter:

```typescript
{
  type: 'json_schema',
  json_schema: {
    name: 'sentence_generation_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sentences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pl_text: {
                type: 'string',
                description: 'Zdanie w języku polskim zawierające słowo angielskie'
              },
              target_en: {
                type: 'string',
                description: 'Słowo angielskie użyte w zdaniu'
              }
            },
            required: ['pl_text', 'target_en'],
            additionalProperties: false
          }
        }
      },
      required: ['sentences'],
      additionalProperties: false
    }
  }
}
```

## Podsumowanie

Ten plan wdrożenia zapewnia kompleksowe podejście do implementacji usługi OpenRouter, uwzględniając wszystkie wymagane komponenty: komunikaty systemowe i użytkownika, ustrukturyzowane odpowiedzi przez JSON Schema, konfigurację modelu i parametrów, obsługę błędów oraz kwestie bezpieczeństwa. Plan jest dostosowany do stacku technologicznego projektu (Astro, TypeScript, Supabase) i może być bezpośrednio wykorzystany przez developera do implementacji.
