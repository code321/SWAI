import type { APIRoute } from "astro";
import type { DashboardDTO } from "../../types";
import { getDashboard } from "../../lib/services/dashboard/getDashboard";

/**
 * GET /api/dashboard
 *
 * Returns dashboard summary: set totals, active session, and remaining generations.
 * Requires authentication.
 *
 * Response: DashboardDTO
 * Status: 200 OK | 401 Unauthorized | 500 Internal Server Error
 */
export const GET: APIRoute = async ({ locals, cookies, url }) => {
  const supabase = locals.supabase;

  // Get access token from cookie (optional for now - TODO: make required when auth is implemented)
  const accessToken = cookies.get("sb-access-token")?.value;

  // TODO: Get user ID from authentication middleware when implemented
  // For now, using a placeholder - this will be replaced with actual auth
  let userId = "bec776c2-538f-4375-a91e-03aba1adfbfa"; // This will come from auth middleware later

  // Try to get authenticated user if token exists
  if (accessToken) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (!authError && user) {
      userId = user.id;
    }
  }

  try {
    // Get dashboard data
    const dashboard: DashboardDTO = await getDashboard(supabase, userId);

    return new Response(JSON.stringify(dashboard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch dashboard data",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const prerender = false;
