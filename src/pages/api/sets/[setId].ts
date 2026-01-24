import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { setIdParamSchema, setUpdateCommandSchema } from "../../../lib/schemas/sets";
import { getSetById } from "../../../lib/services/sets/getSetById";
import { updateSet } from "../../../lib/services/sets/updateSet";
import { deleteSet } from "../../../lib/services/sets/deleteSet";
import type { SetDetailDTO, SetUpdateResponseDTO, ApiErrorDTO } from "../../../types";

// Disable prerendering for this dynamic route
export const prerender = false;

/**
 * GET /api/sets/{setId}
 *
 * Returns details of a single set including all words and latest generation metadata.
 *
 * URL Parameters:
 * - setId: UUID of the set to retrieve
 *
 * Returns:
 * - 200: Success with SetDetailDTO
 * - 400: Invalid setId (not a UUID)
 * - 404: Set not found or doesn't belong to user
 * - 500: Server error
 */
export const GET: APIRoute = async (context) => {
  try {
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
    const userId = "bec776c2-538f-4375-a91e-03aba1adfbfa"; // Placeholder

    // Validate setId parameter
    let setId: string;
    try {
      const validated = setIdParamSchema.parse({ setId: context.params.setId });
      setId = validated.setId;
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_SET_ID",
              message: "setId must be a valid UUID.",
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

    // Call service to retrieve set details
    const result = await getSetById(supabase, userId, setId);

    // Return 404 if set not found or doesn't belong to user
    if (!result) {
      return new Response(
        JSON.stringify({
          error: {
            code: "SET_NOT_FOUND",
            message: "Set not found.",
          },
        } satisfies ApiErrorDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Return successful response
    const response: SetDetailDTO = result;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in GET /api/sets/{setId}:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch set details.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};

/**
 * PATCH /api/sets/{setId}
 *
 * Updates set metadata (name, level) and/or replaces the words collection.
 * All fields in request body are optional (partial update).
 *
 * URL Parameters:
 * - setId: UUID of the set to update
 *
 * Request Body (all optional):
 * - name: New set name (1-100 chars, unique per user)
 * - level: New CEFR level (A1-C2)
 * - words: New words collection (1-5 words, replaces entire collection)
 *
 * Returns:
 * - 200: Successfully updated with SetUpdateResponseDTO (SetDetailDTO)
 * - 400: Invalid setId or request body
 * - 404: Set not found
 * - 409: Duplicate name or active session blocking update
 * - 422: Too many words or duplicate English words
 * - 500: Server error
 */
export const PATCH: APIRoute = async (context) => {
  try {
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
    const userId = "bec776c2-538f-4375-a91e-03aba1adfbfa"; // Placeholder

    // Validate setId parameter
    let setId: string;
    try {
      const validated = setIdParamSchema.parse({ setId: context.params.setId });
      setId = validated.setId;
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_SET_ID",
              message: "setId must be a valid UUID.",
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

    // Validate request body
    let validatedCommand;
    try {
      validatedCommand = setUpdateCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;

        // Check for invalid CEFR level
        const levelError = errors.find((e) => e.path.includes("level"));
        if (levelError) {
          return new Response(
            JSON.stringify({
              error: {
                code: "INVALID_CEFR_LEVEL",
                message: "level must be one of A1, A2, B1, B2, C1, C2.",
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        }

        // Check for words array validation
        const wordsError = errors.find((e) => e.path.includes("words"));
        if (wordsError && wordsError.code === "too_big") {
          return new Response(
            JSON.stringify({
              error: {
                code: "TOO_MANY_WORDS",
                message: "Maximum 5 words allowed per set.",
              },
            } satisfies ApiErrorDTO),
            {
              status: 422,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        }

        if (wordsError && wordsError.code === "too_small") {
          return new Response(
            JSON.stringify({
              error: {
                code: "NO_WORDS",
                message: "At least one word is required.",
              },
            } satisfies ApiErrorDTO),
            {
              status: 422,
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

    // Call service to update set
    try {
      const result = await updateSet(supabase, userId, setId, validatedCommand);

      // Return 404 if set not found
      if (!result) {
        return new Response(
          JSON.stringify({
            error: {
              code: "SET_NOT_FOUND",
              message: "Set not found.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Return successful response
      const response: SetUpdateResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error: any) {
      // Handle specific service errors
      if (error.code === "DUPLICATE_NAME") {
        return new Response(
          JSON.stringify({
            error: {
              code: "DUPLICATE_NAME",
              message: "Set with this name already exists.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (error.code === "ACTIVE_SESSION") {
        return new Response(
          JSON.stringify({
            error: {
              code: "ACTIVE_SESSION",
              message: "Cannot update set with active exercise session.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (error.code === "DUPLICATE_ENGLISH_WORD") {
        return new Response(
          JSON.stringify({
            error: {
              code: "DUPLICATE_ENGLISH_WORD",
              message: error.message,
            },
          } satisfies ApiErrorDTO),
          {
            status: 422,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Re-throw to be caught by outer catch
      throw error;
    }
  } catch (error) {
    // Log error for debugging
    console.error("Error in PATCH /api/sets/{setId}:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to update set.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};

/**
 * DELETE /api/sets/{setId}
 *
 * Permanently deletes a set and all related data (words, generations, sessions, attempts, ratings).
 * Prevents deletion if there's an active exercise session.
 *
 * URL Parameters:
 * - setId: UUID of the set to delete
 *
 * Returns:
 * - 204: Successfully deleted (No Content)
 * - 400: Invalid setId (not a UUID)
 * - 404: Set not found
 * - 409: Active session prevents deletion
 * - 500: Server error
 */
export const DELETE: APIRoute = async (context) => {
  try {
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
    const userId = "bec776c2-538f-4375-a91e-03aba1adfbfa"; // Placeholder

    // Validate setId parameter
    let setId: string;
    try {
      const validated = setIdParamSchema.parse({ setId: context.params.setId });
      setId = validated.setId;
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_SET_ID",
              message: "setId must be a valid UUID.",
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

    // Call service to delete set
    const result = await deleteSet(supabase, userId, setId);

    // Handle service result
    if (!result.success) {
      if (result.error === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: {
              code: "SET_NOT_FOUND",
              message: "Set not found.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (result.error === "ACTIVE_SESSION") {
        return new Response(
          JSON.stringify({
            error: {
              code: "ACTIVE_SESSION",
              message: "Cannot delete set with active exercise session. Please finish the session first.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }
    }

    // Return 204 No Content on success
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in DELETE /api/sets/{setId}:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to delete set.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};
