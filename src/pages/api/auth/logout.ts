import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../lib/auth/supabase.auth";
import { createInternalServerError } from "../../../lib/auth/errorMapper";

// Ensure SSR rendering
export const prerender = false;

/**
 * POST /api/auth/logout
 *
 * Logs out user by clearing session
 * Removes HttpOnly session cookies
 *
 * Success (200): { message: "LOGGED_OUT" }
 * Errors:
 * - 500: INTERNAL_SERVER_ERROR
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase auth client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sign out (this will clear cookies via setAll)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      // Even if signOut fails, we should still clear cookies client-side
      // Return success to allow frontend to redirect
    }

    return new Response(
      JSON.stringify({
        message: "LOGGED_OUT",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify(createInternalServerError(error)), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
