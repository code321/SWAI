import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";
import { createSupabaseServerInstance } from "../lib/auth/supabase.auth.ts";

/**
 * Public paths that don't require authentication
 * Includes auth pages and auth API endpoints
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/recover",
  "/api/auth/reset-password",
  "/api/auth/exchange",
];

/**
 * Middleware for authentication and session management
 *
 * Responsibilities:
 * 1. Set up Supabase client for data operations
 * 2. Verify user session using auth client
 * 3. Redirect unauthenticated users from protected routes
 * 4. Redirect authenticated users from auth pages to dashboard
 * 5. Populate Astro.locals.user for use in endpoints and pages
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, url, request, redirect } = context;

  // Set up data client (existing functionality)
  locals.supabase = supabaseClient;

  // Skip auth check for public paths
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Create auth client for session verification
  const authClient = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Verify user session
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // If user is authenticated
  if (user) {
    // Populate locals.user for use in endpoints and pages
    locals.user = {
      id: user.id,
      email: user.email,
    };

    // Redirect authenticated users from auth pages to dashboard
    if (url.pathname.startsWith("/auth/")) {
      return redirect("/app/dashboard");
    }

    return next();
  }

  // User is NOT authenticated
  // Allow landing page (/) to handle its own redirect logic
  if (url.pathname === "/") {
    return next();
  }

  // Redirect to login for protected routes (/app/*)
  if (url.pathname.startsWith("/app/")) {
    return redirect(`/auth/login?next=${encodeURIComponent(url.pathname)}`);
  }

  // For API routes, return 401 (handled by endpoint)
  if (url.pathname.startsWith("/api/")) {
    return next(); // Let endpoint handle 401
  }

  return next();
});
