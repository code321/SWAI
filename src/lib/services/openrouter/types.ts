/**
 * Configuration for OpenRouterService constructor
 */
export interface OpenRouterServiceConfig {
  /** OpenRouter API key (required) */
  apiKey: string;
  /** Base URL for OpenRouter API (optional, defaults to https://openrouter.ai/api/v1) */
  baseUrl?: string;
  /** Default model to use (optional) */
  defaultModel?: string;
  /** Request timeout in milliseconds (optional, defaults to 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (optional, defaults to 3) */
  maxRetries?: number;
}

/**
 * Request parameters for generateSentences method
 */
export interface GenerateSentencesRequest {
  /** Array of words with Polish and English translations */
  words: { pl: string; en: string }[];
  /** Model identifier in format: provider/model-name */
  modelId: string;
  /** Temperature for generation (optional, 0.0-2.0) */
  temperature?: number;
  /** Custom system message (optional) */
  systemMessage?: string;
  /** Prompt version identifier */
  promptVersion: string;
}

/**
 * Response from generateSentences method
 */
export interface GenerateSentencesResponse {
  /** Array of generated sentences */
  sentences: {
    /** Optional word ID (for mapping) */
    word_id?: string;
    /** Polish sentence text containing the English word */
    pl_text: string;
    /** Target English word used in the sentence */
    target_en: string;
  }[];
  /** Usage statistics */
  usage: {
    /** Input tokens used */
    tokens_in: number;
    /** Output tokens generated */
    tokens_out: number;
    /** Cost in USD */
    cost_usd: number;
  };
}

/**
 * Full request payload for OpenRouter API
 */
export interface OpenRouterRequest {
  /** Model identifier */
  model: string;
  /** Array of messages */
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  /** Temperature parameter (optional) */
  temperature?: number;
  /** Response format configuration */
  response_format: ResponseFormat;
  /** Extra headers for the request (optional) */
  extra_headers?: Record<string, string>;
}

/**
 * Response from OpenRouter API
 */
export interface OpenRouterResponse {
  /** Response ID */
  id: string;
  /** Model used */
  model: string;
  /** Array of choices */
  choices: {
    /** Message content */
    message: {
      /** Content string */
      content: string;
      /** Role */
      role: string;
    };
    /** Finish reason */
    finish_reason: string;
  }[];
  /** Usage statistics */
  usage: {
    /** Prompt tokens */
    prompt_tokens: number;
    /** Completion tokens */
    completion_tokens: number;
  };
}

/**
 * Response format configuration with JSON Schema
 */
export interface ResponseFormat {
  /** Type of response format */
  type: "json_schema";
  /** JSON Schema configuration */
  json_schema: {
    /** Schema name */
    name: string;
    /** Strict mode flag */
    strict: true;
    /** JSON Schema definition */
    schema: JSONSchema;
  };
}

/**
 * JSON Schema definition
 */
export interface JSONSchema {
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

/**
 * Usage statistics for the service
 */
export interface UsageStats {
  /** Total input tokens used */
  totalTokensIn: number;
  /** Total output tokens generated */
  totalTokensOut: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total number of requests made */
  requestCount: number;
}

/**
 * Usage metrics from a single request
 */
export interface Usage {
  /** Prompt tokens */
  prompt_tokens: number;
  /** Completion tokens */
  completion_tokens: number;
}

/**
 * Parsed content from generated sentences
 */
export interface SentenceGenerationContent {
  /** Array of generated sentences */
  sentences: {
    /** Polish text */
    pl_text: string;
    /** Target English word */
    target_en: string;
  }[];
}
