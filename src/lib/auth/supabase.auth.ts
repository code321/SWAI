import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../../db/database.types";

/**
 * Cookie options for Supabase Auth session management
 * Used for HttpOnly cookies to store access and refresh tokens
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse cookie header string into array of cookie objects
 * Required by @supabase/ssr for cookie management
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server instance for authentication
 * This is separate from the data client (supabaseClient) to maintain clear separation of concerns
 *
 * @param context - Context with headers and cookies from Astro
 * @returns Configured Supabase server client for auth operations
 *
 * @example
 * ```typescript
 * const supabase = createSupabaseServerInstance({
 *   cookies: Astro.cookies,
 *   headers: Astro.request.headers
 * });
 *
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email, password
 * });
 * ```
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
