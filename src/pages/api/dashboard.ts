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
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  // Get user ID from middleware (populated during auth verification)
  const userId = locals.user?.id;

  if (!userId) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
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
