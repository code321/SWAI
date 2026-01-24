/**
 * Custom error class for OpenRouter service errors
 */
export class OpenRouterError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }
}

/**
 * Maps HTTP status codes to OpenRouter error codes
 */
export function mapStatusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 401:
      return "OPENROUTER_AUTH_ERROR";
    case 403:
      return "OPENROUTER_AUTH_ERROR";
    case 429:
      return "OPENROUTER_RATE_LIMIT";
    case 500:
    case 502:
    case 503:
      return "OPENROUTER_SERVER_ERROR";
    case 400:
      return "OPENROUTER_INVALID_REQUEST";
    default:
      return "OPENROUTER_UNKNOWN_ERROR";
  }
}

/**
 * Creates a configuration error
 */
export function createConfigError(message: string): OpenRouterError {
  return new OpenRouterError("OPENROUTER_CONFIG_ERROR", message);
}

/**
 * Creates an invalid model ID error
 */
export function createInvalidModelError(): OpenRouterError {
  return new OpenRouterError("INVALID_MODEL_ID", "Model ID must follow format: provider/model-name");
}

/**
 * Creates a timeout error
 */
export function createTimeoutError(): OpenRouterError {
  return new OpenRouterError("OPENROUTER_TIMEOUT", "Request to OpenRouter API timed out");
}

/**
 * Creates a network error
 */
export function createNetworkError(originalError?: unknown): OpenRouterError {
  return new OpenRouterError(
    "OPENROUTER_NETWORK_ERROR",
    "Network error while connecting to OpenRouter API",
    undefined,
    originalError
  );
}

/**
 * Creates an invalid response error
 */
export function createInvalidResponseError(details?: string): OpenRouterError {
  const message = details
    ? `Response from OpenRouter API does not match expected schema: ${details}`
    : "Response from OpenRouter API does not match expected schema";
  return new OpenRouterError("OPENROUTER_INVALID_RESPONSE", message);
}

/**
 * Creates a parse error
 */
export function createParseError(originalError?: unknown): OpenRouterError {
  return new OpenRouterError(
    "OPENROUTER_PARSE_ERROR",
    "Failed to parse response from OpenRouter API",
    undefined,
    originalError
  );
}

/**
 * Creates an empty response error
 */
export function createEmptyResponseError(): OpenRouterError {
  return new OpenRouterError("OPENROUTER_EMPTY_RESPONSE", "OpenRouter API returned an empty response");
}

/**
 * Creates an invalid request error
 */
export function createInvalidRequestError(message: string): OpenRouterError {
  return new OpenRouterError("INVALID_REQUEST", message);
}
