import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../lib/auth/supabase.auth";
import {
  mapAuthErrorToApiError,
  getHttpStatusForAuthError,
  createValidationError,
  createInternalServerError,
} from "../../../lib/auth/errorMapper";
import { authSignUpCommandSchema } from "../../../lib/schemas/auth";

// Ensure SSR rendering
export const prerender = false;

/**
 * POST /api/auth/signup
 *
 * Creates new user account with email and password
 * Auto-logs in user after successful registration
 * Creates user profile with timezone
 * Sets HttpOnly cookies for session management
 *
 * Request body:
 * - email: string
 * - password: string
 * - data.timezone: string (IANA format, auto-collected from browser)
 *
 * Success (201): User data with session in cookies
 * Errors:
 * - 400: VALIDATION_ERROR (invalid input)
 * - 409: EMAIL_ALREADY_REGISTERED (email exists)
 * - 500: INTERNAL_SERVER_ERROR
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = authSignUpCommandSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(JSON.stringify(createValidationError(firstError.message)), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password, data } = validationResult.data;

    // Create Supabase auth client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          timezone: data.timezone,
        },
      },
    });

    if (signUpError) {
      return new Response(JSON.stringify(mapAuthErrorToApiError(signUpError)), {
        status: getHttpStatusForAuthError(signUpError),
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!signUpData.user) {
      return new Response(JSON.stringify(createInternalServerError()), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create user profile with timezone
    // Note: This assumes profiles table has a trigger or we create it manually
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: signUpData.user.id,
      timezone: data.timezone,
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway - profile creation is not critical for signup success
      // User can still log in and use the app
    }

    // Session cookies are automatically set by createSupabaseServerInstance
    // User is now auto-logged in (US-001 requirement)
    return new Response(
      JSON.stringify({
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email,
        },
        message: "Konto zostało utworzone pomyślnie",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return new Response(JSON.stringify(createInternalServerError(error)), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
