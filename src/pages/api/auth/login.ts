import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../lib/auth/supabase.auth";
import {
  mapAuthErrorToApiError,
  getHttpStatusForAuthError,
  createValidationError,
} from "../../../lib/auth/errorMapper";
import { authLoginCommandSchema } from "../../../lib/schemas/auth";

// Ensure SSR rendering
export const prerender = false;

/**
 * POST /api/auth/login
 *
 * Authenticates user with email and password
 * Sets HttpOnly cookies for session management
 *
 * Request body:
 * - email: string
 * - password: string
 *
 * Success (200): AuthSessionDTO - NOT returned to client, session stored in cookies
 * Errors:
 * - 400: VALIDATION_ERROR (invalid input)
 * - 401: INVALID_CREDENTIALS (wrong email/password)
 * - 500: INTERNAL_SERVER_ERROR
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = authLoginCommandSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(JSON.stringify(createValidationError(firstError.message)), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = validationResult.data;

    // Create Supabase auth client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify(mapAuthErrorToApiError(error)), {
        status: getHttpStatusForAuthError(error),
        headers: { "Content-Type": "application/json" },
      });
    }

    // Session cookies are automatically set by createSupabaseServerInstance
    // Return minimal user data (session is in cookies)
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Wystąpił błąd serwera. Spróbuj ponownie później",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
