import type { AuthError } from "@supabase/supabase-js";

import type { ApiErrorDTO } from "../../types";

/**
 * Map Supabase AuthError to standardized ApiErrorDTO
 * Provides consistent error codes and user-friendly messages in Polish
 *
 * @param error - Supabase AuthError object
 * @returns Standardized ApiErrorDTO with code and message
 *
 * @example
 * ```typescript
 * const { error } = await supabase.auth.signInWithPassword({ email, password });
 * if (error) {
 *   return new Response(JSON.stringify(mapAuthErrorToApiError(error)), {
 *     status: getHttpStatusForAuthError(error)
 *   });
 * }
 * ```
 */
export function mapAuthErrorToApiError(error: AuthError): ApiErrorDTO {
  // Map common Supabase error messages to standardized codes
  const errorMessage = error.message.toLowerCase();

  // Invalid credentials
  if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid email or password")) {
    return {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Nieprawidłowy email lub hasło",
      },
    };
  }

  // Email already registered
  if (errorMessage.includes("user already registered") || errorMessage.includes("email already exists")) {
    return {
      error: {
        code: "EMAIL_ALREADY_REGISTERED",
        message: "Konto z tym adresem email już istnieje",
      },
    };
  }

  // Weak password
  if (errorMessage.includes("password") && (errorMessage.includes("weak") || errorMessage.includes("too short"))) {
    return {
      error: {
        code: "WEAK_PASSWORD",
        message: "Hasło musi mieć minimum 8 znaków",
      },
    };
  }

  // Invalid email format
  if (errorMessage.includes("invalid email") || errorMessage.includes("email format")) {
    return {
      error: {
        code: "INVALID_EMAIL",
        message: "Podaj poprawny adres email",
      },
    };
  }

  // Recovery token invalid or expired
  if (
    errorMessage.includes("token") &&
    (errorMessage.includes("invalid") || errorMessage.includes("expired") || errorMessage.includes("malformed"))
  ) {
    return {
      error: {
        code: "RECOVERY_TOKEN_INVALID",
        message: "Link do resetu hasła jest nieprawidłowy lub wygasł",
      },
    };
  }

  // User not found
  if (errorMessage.includes("user not found")) {
    return {
      error: {
        code: "USER_NOT_FOUND",
        message: "Użytkownik nie został znaleziony",
      },
    };
  }

  // Session expired
  if (errorMessage.includes("session") && errorMessage.includes("expired")) {
    return {
      error: {
        code: "SESSION_EXPIRED",
        message: "Sesja wygasła. Zaloguj się ponownie",
      },
    };
  }

  // Generic authentication error
  return {
    error: {
      code: "AUTH_ERROR",
      message: "Wystąpił błąd podczas uwierzytelniania",
    },
  };
}

/**
 * Get appropriate HTTP status code for Supabase auth error
 *
 * @param error - Supabase AuthError object
 * @returns HTTP status code (400, 401, 409, or 500)
 */
export function getHttpStatusForAuthError(error: AuthError): number {
  const errorMessage = error.message.toLowerCase();

  // 401 Unauthorized - invalid credentials, session issues
  if (
    errorMessage.includes("invalid login credentials") ||
    errorMessage.includes("invalid email or password") ||
    errorMessage.includes("session") ||
    errorMessage.includes("token")
  ) {
    return 401;
  }

  // 409 Conflict - email already exists
  if (errorMessage.includes("user already registered") || errorMessage.includes("email already exists")) {
    return 409;
  }

  // 400 Bad Request - validation errors
  if (
    errorMessage.includes("password") ||
    errorMessage.includes("email format") ||
    errorMessage.includes("invalid email")
  ) {
    return 400;
  }

  // 500 Internal Server Error - everything else
  return 500;
}

/**
 * Create a standardized validation error response
 *
 * @param message - User-friendly error message in Polish
 * @returns ApiErrorDTO with VALIDATION_ERROR code
 */
export function createValidationError(message: string): ApiErrorDTO {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

/**
 * Create a standardized unauthorized error response
 *
 * @param message - Optional custom message, defaults to generic message
 * @returns ApiErrorDTO with UNAUTHORIZED code
 */
export function createUnauthorizedError(message = "Zaloguj się, aby kontynuować"): ApiErrorDTO {
  return {
    error: {
      code: "UNAUTHORIZED",
      message,
    },
  };
}

/**
 * Create a standardized internal server error response
 * Logs the actual error server-side but returns generic message to client
 *
 * @param actualError - The actual error that occurred (for logging)
 * @returns ApiErrorDTO with INTERNAL_SERVER_ERROR code
 */
export function createInternalServerError(actualError?: unknown): ApiErrorDTO {
  // Log the actual error server-side for debugging
  if (actualError) {
    console.error("Internal server error:", actualError);
  }

  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Wystąpił błąd serwera. Spróbuj ponownie później",
    },
  };
}
