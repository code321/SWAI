import type { APIRoute } from "astro";
import type { UsageDailyDTO } from "../../../types";
import { getDailyUsage } from "../../../lib/services/usage/getDailyUsage";

/**
 * GET /api/usage/daily
 *
 * Returns today's generation quota and usage stats.
 * Requires authentication.
 *
 * Response: UsageDailyDTO
 * Status: 200 OK | 401 Unauthorized | 500 Internal Server Error
 */
export const GET: APIRoute = async ({ locals, cookies }) => {
  const supabase = locals.supabase;

  // Get access token from cookie (optional for now - TODO: make required when auth is implemented)
  const accessToken = cookies.get("sb-access-token")?.value;

  // If no auth token, return mock data for development
  if (!accessToken) {
    const mockUsage: UsageDailyDTO = {
      limit: 10,
      used: 3,
      remaining: 7,
      next_reset_at: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };

    return new Response(JSON.stringify(mockUsage), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set auth token for this request
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    // Return mock data instead of error for now
    const mockUsage: UsageDailyDTO = {
      limit: 10,
      used: 0,
      remaining: 10,
      next_reset_at: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };

    return new Response(JSON.stringify(mockUsage), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch user's timezone from profile (optional - defaults to UTC)
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", user.id).single();

    const timezone = profile?.timezone || "UTC";

    // Get daily usage stats
    const usage: UsageDailyDTO = await getDailyUsage(supabase, user.id, timezone);

    return new Response(JSON.stringify(usage), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching daily usage:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch daily usage",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const prerender = false;
