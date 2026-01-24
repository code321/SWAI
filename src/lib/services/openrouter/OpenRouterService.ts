import type {
  OpenRouterServiceConfig,
  GenerateSentencesRequest,
  GenerateSentencesResponse,
  OpenRouterRequest,
  OpenRouterResponse,
  ResponseFormat,
  UsageStats,
  JSONSchema,
} from "./types";
import {
  OpenRouterError,
  createConfigError,
  createInvalidModelError,
  createInvalidRequestError,
  createTimeoutError,
  createNetworkError,
  createParseError,
  createInvalidResponseError,
  createEmptyResponseError,
  mapStatusCodeToErrorCode,
} from "./errors";
import { validateOpenRouterResponse, validateSentenceGenerationContent } from "./schemas";

/**
 * Service for communicating with OpenRouter API
 * Handles sentence generation with structured outputs via JSON Schema
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string | undefined;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private usageStats: UsageStats;

  /**
   * Default system message for sentence generation
   */
  private readonly DEFAULT_SYSTEM_MESSAGE = `Jesteś pomocnym asystentem do nauki języka angielskiego. 
Twoim zadaniem jest generowanie krótkich, naturalnych zdań w języku polskim, 
które zawierają podane słowa angielskie. Zdania powinny być:
- Krótkie (maksymalnie 10-15 słów)
- Naturalne i zrozumiałe
- Odpowiednie dla poziomu CEFR A1
- Zawierające dokładnie jedno słowo angielskie z listy
Wygenerowane zdania zwróć w formacie JSON:
{
  "sentences": [
    {
      "pl_text": "Zdanie w języku polskim",
      "target_en": "Słowo angielskie"
    }
  ]
}, gdzie "pl_text" to zdanie w języku polskim, a "target_en" to słowo angielskie użyte w zdaniu.
Nie dodawaj żadnych innych tekstów poza JSON. 
`;

  /**
   * Creates a new OpenRouterService instance
   * @param config - Service configuration
   * @throws {OpenRouterError} If apiKey is missing or invalid
   */
  constructor(config: OpenRouterServiceConfig) {
    // Validate required configuration
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw createConfigError("OpenRouter API key is required");
    }

    // Initialize fields with defaults
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;

    // Initialize usage statistics
    this.usageStats = {
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalCostUsd: 0,
      requestCount: 0,
    };
  }

  /**
   * Generates sentences for given words using OpenRouter API
   * @param request - Generation request parameters
   * @returns Generated sentences with usage statistics
   * @throws {OpenRouterError} On validation, network, or API errors
   */

  private stripJsonFence(s: string): string {
    return s
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }

  async generateSentences(request: GenerateSentencesRequest): Promise<GenerateSentencesResponse> {
    console.log("generate sentences");

    // Validate input parameters
    if (!request.words || request.words.length === 0) {
      throw createInvalidRequestError("Words array cannot be empty");
    }

    // if (!/^[\w-]+\/[\w.-]+$/.test(request.modelId)) {
    //   throw createInvalidModelError();
    // }

    console.log("request", request);
    // Build request payload
    const payload = this.buildRequestPayload(request);

    console.log("payload", payload);
    // Send request with retry logic
    const apiResponse = await this.sendRequest(payload);

    //const apiResponse = this.stripJsonFence(apiResponseE.choices[0].message.content);

    console.log("apiResponse", apiResponse);

    // Parse and validate response
    const parsed = this.parseResponse(apiResponse);

    console.log("parsed", parsed);

    // Calculate cost
    const cost = this.calculateCost(apiResponse.usage, request.modelId);

    // Update usage statistics
    this.usageStats.totalTokensIn += apiResponse.usage.prompt_tokens;
    this.usageStats.totalTokensOut += apiResponse.usage.completion_tokens;
    this.usageStats.totalCostUsd += cost;
    this.usageStats.requestCount += 1;

    // Return response with cost
    return {
      sentences: parsed.sentences,
      usage: {
        tokens_in: apiResponse.usage.prompt_tokens,
        tokens_out: apiResponse.usage.completion_tokens,
        cost_usd: cost,
      },
    };
  }

  /**
   * Validates if a model supports required features
   * @param modelId - Model identifier in format provider/model-name
   * @returns True if model is supported
   */
  async validateModel(modelId: string): Promise<boolean> {
    // Validate format
    if (!/^[\w-]+\/[\w.-]+$/.test(modelId)) {
      return false;
    }

    // For MVP, accept all properly formatted model IDs
    // This can be extended to query OpenRouter's model list
    return true;
  }

  /**
   * Returns cumulative usage statistics
   * @returns Usage statistics since service initialization
   */
  getUsageStats(): UsageStats {
    // Return a copy to prevent external modification
    return { ...this.usageStats };
  }

  /**
   * Builds system message for the model
   * @param customMessage - Optional custom system message
   * @returns System message string
   */
  private buildSystemMessage(customMessage?: string): string {
    return customMessage ?? this.DEFAULT_SYSTEM_MESSAGE;
  }

  /**
   * Builds user message containing word list
   * @param words - Array of words with translations
   * @returns Formatted user message
   */
  private buildUserMessage(systemMessage: string, words: { pl: string; en: string }[]): string {
    const wordList = words.map((word, index) => `${index + 1}. ${word.en} (${word.pl})`).join("\n");

    return `${systemMessage}
    Wygeneruj zdania w języku polskim używając następujących słów angielskich:
${wordList}

Dla każdego słowa wygeneruj jedno zdanie polskie, które naturalnie zawiera to słowo angielskie.`;
  }

  /**
   * Builds response_format object with JSON Schema for structured outputs
   * @returns ResponseFormat configuration
   */
  private buildResponseFormat(): ResponseFormat {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        sentences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pl_text: {
                type: "string",
                description: "Zdanie w języku polskim zawierające słowo angielskie",
              },
              target_en: {
                type: "string",
                description: "Słowo angielskie użyte w zdaniu",
              },
            },
            required: ["pl_text", "target_en"],
            additionalProperties: false,
          },
        },
      },
      required: ["sentences"],
      additionalProperties: false,
    };

    return {
      type: "json_schema",
      json_schema: {
        name: "sentence_generation_response",
        strict: true,
        schema,
      },
    };
  }

  /**
   * Builds complete request payload for OpenRouter API
   * @param request - Generation request parameters
   * @returns Complete API request payload
   */
  private buildRequestPayload(request: GenerateSentencesRequest): OpenRouterRequest {
    const systemMessage = this.buildSystemMessage(request.systemMessage);
    console.log("systemMessage", systemMessage);
    const userMessage = this.buildUserMessage(systemMessage, request.words);
    console.log("userMessage", userMessage);
    const responseFormat = this.buildResponseFormat();
    console.log("responseFormat", responseFormat);

    return {
      model: request.modelId || this.defaultModel || "",
      messages: [
        // { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: request.temperature,
      response_format: responseFormat,
    };
  }

  /**
   * Sends request to OpenRouter API with retry logic
   * @param payload - Request payload
   * @param attempt - Current attempt number (internal)
   * @returns API response
   * @throws {OpenRouterError} On network, timeout, or API errors
   */
  private async sendRequest(payload: OpenRouterRequest, attempt = 1): Promise<OpenRouterResponse> {
    try {
      console.log("sendRequest", payload);
      console.log("this.apiKey", this.apiKey);
      console.log("this.baseUrl", this.baseUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://smartwordsai.app",
          "X-Title": "SmartWordsAI",
        },
        // body: JSON.stringify({
        //   model: "google/gemma-3n-e2b-it:free",
        //   messages: [
        //     {
        //       role: "user",
        //       content: "What is the meaning of life?",
        //     },
        //   ],
        // }),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      console.log("response", response);
      console.log("response.ok", response.ok);
      console.log("response.status", response.status);
      console.log("response.statusText", response.statusText);
      console.log("response.headers", response.headers);
      console.log("response.body", response.body);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseErrorResponse(response);
        if (this.shouldRetry(error, attempt)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          return this.sendRequest(payload, attempt + 1);
        }
        throw error;
      }

      const data = await response.json();
      console.log("data", data.choices[0].message.content);
      return validateOpenRouterResponse(data);
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = createTimeoutError();
        if (this.shouldRetry(timeoutError, attempt)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          return this.sendRequest(payload, attempt + 1);
        }
        throw timeoutError;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        const networkError = createNetworkError(error);
        if (this.shouldRetry(networkError, attempt)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          return this.sendRequest(payload, attempt + 1);
        }
        throw networkError;
      }

      // Re-throw OpenRouterError or validation errors
      throw error;
    }
  }

  /**
   * Parses and validates API response
   * @param response - OpenRouter API response
   * @returns Parsed generation response
   * @throws {OpenRouterError} On validation or parsing errors
   */
  private parseResponse(response: OpenRouterResponse): GenerateSentencesResponse {
    console.log("parseResponse", response);
    console.log("response.choices[0].message.content", response.choices[0].message.content);
    console.log("response.choices", response.choices);
    console.log("response.choices[0].message.content", response.choices[0].message.content);
    //Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw createEmptyResponseError();
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw createEmptyResponseError();
    }

    try {
      // Parse JSON content
      const contentStripped = this.stripJsonFence(content);

      console.log("content", content);
      const parsed = JSON.parse(contentStripped);
      console.log("parsed", parsed);
      // Validate against schema
      const validated = validateSentenceGenerationContent(parsed);

      // Return in expected format
      return {
        sentences: validated.sentences,
        usage: {
          tokens_in: response.usage.prompt_tokens,
          tokens_out: response.usage.completion_tokens,
          cost_usd: 0, // Will be calculated by caller
        },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw createParseError(error);
      }
      throw createInvalidResponseError(error instanceof Error ? error.message : "Unknown validation error");
    }
  }

  /**
   * Calculates cost based on token usage and model pricing
   * @param usage - Token usage metrics
   * @param _modelId - Model identifier (reserved for future use)
   * @returns Cost in USD
   */
  private calculateCost(usage: { prompt_tokens: number; completion_tokens: number }, _modelId: string): number {
    // Simple pricing model - can be extended with actual model pricing
    // For MVP, using approximate OpenAI GPT-4 pricing
    const INPUT_PRICE_PER_1K = 0.03; // $0.03 per 1K input tokens
    const OUTPUT_PRICE_PER_1K = 0.06; // $0.06 per 1K output tokens

    const inputCost = (usage.prompt_tokens / 1000) * INPUT_PRICE_PER_1K;
    const outputCost = (usage.completion_tokens / 1000) * OUTPUT_PRICE_PER_1K;

    // Round to 6 decimal places
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }

  /**
   * Parses error response from API
   * @param response - HTTP response with error
   * @returns OpenRouterError
   */
  private async parseErrorResponse(response: Response): Promise<OpenRouterError> {
    const statusCode = response.status;
    const errorCode = mapStatusCodeToErrorCode(statusCode);

    try {
      const errorData = await response.json();
      const message = errorData.error?.message || errorData.message || response.statusText;

      return new OpenRouterError(errorCode, message, statusCode, errorData);
    } catch {
      // Failed to parse error JSON
      return new OpenRouterError(errorCode, response.statusText || "Unknown error", statusCode);
    }
  }

  /**
   * Determines if request should be retried
   * @param error - Error that occurred
   * @param attempt - Current attempt number
   * @returns True if should retry
   */
  private shouldRetry(error: Error | OpenRouterError, attempt: number): boolean {
    // Don't retry if max retries exceeded
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Retry on network and timeout errors
    if (
      error instanceof OpenRouterError &&
      (error.code === "OPENROUTER_TIMEOUT" || error.code === "OPENROUTER_NETWORK_ERROR")
    ) {
      return true;
    }

    // Retry on server errors (5xx)
    if (error instanceof OpenRouterError && error.code === "OPENROUTER_SERVER_ERROR") {
      return true;
    }

    // Retry on rate limit (429)
    if (error instanceof OpenRouterError && error.code === "OPENROUTER_RATE_LIMIT") {
      return true;
    }

    // Don't retry on client errors (4xx) except 429
    return false;
  }

  /**
   * Delays execution for specified milliseconds
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
