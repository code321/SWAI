import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { sessionCreateCommandSchema } from "../../../lib/schemas/sessions";
import { startSession } from "../../../lib/services/sessions/startSession";
import { toApiError } from "../../../lib/utils";
import type { SessionCreateResponseDTO, ApiErrorDTO } from "../../../types";

export const prerender = false;

/**
 * POST /api/sessions
 *
 * Creates a new exercise session for a vocabulary set.
 * Only one active session per set is allowed at a time.
 *
 * Request Body:
 * - set_id: UUID of the set to practice (required)
 * - generation_id: UUID of specific generation to use (optional, defaults to latest)
 * - mode: Exercise mode - only "translate" supported in MVP (required)
 *
 * Returns:
 * - 201: Successfully created session with SessionCreateResponseDTO
 * - 400: Invalid request body
 * - 401: Not authenticated
 * - 404: Set or generation not found
 * - 409: Active session already exists for this set
 * - 422: No generation found for this set
 * - 500: Server error
 */
export const POST: APIRoute = async (context) => {
  try {
    console.log("POST /api/sessions called");
    console.log("context", context);
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: {
            code: "SERVER_ERROR",
            message: "Supabase client not initialized.",
          },
        } satisfies ApiErrorDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // TODO: Get user ID from authentication middleware when implemented
    // For now, using a placeholder - this will be replaced with actual auth
    const userId = "bec776c2-538f-4375-a91e-03aba1adfbfa"; // Placeholder

    // Parse request body
    let body;
    try {
      body = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body.",
          },
        } satisfies ApiErrorDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Validate request body with Zod schema
    let validatedCommand;
    try {
      validatedCommand = sessionCreateCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;

        // Check for missing required fields
        const missingFields = errors
          .filter((e) => e.code === "invalid_type" && e.received === "undefined")
          .map((e) => e.path.join("."));

        if (missingFields.length > 0) {
          return new Response(
            JSON.stringify({
              error: {
                code: "MISSING_FIELDS",
                message: `Required fields missing: ${missingFields.join(", ")}`,
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        }

        // Generic validation error
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: `Validation failed: ${errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
            },
          } satisfies ApiErrorDTO),
          {
            status: 400,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }
      throw error;
    }

    // Call service to start session
    try {
      const result = await startSession(supabase, userId, validatedCommand);

      // Return successful response with 201 Created
      const response: SessionCreateResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error: any) {
      // Map service errors to API errors with appropriate status codes
      const apiError = toApiError(error);

      return new Response(JSON.stringify(apiError.body), {
        status: apiError.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (error) {
    // Log error for debugging
    console.error("Error in POST /api/sessions:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to create session.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};
