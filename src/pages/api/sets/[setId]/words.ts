import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { setIdParamSchema, wordsAddCommandSchema } from "../../../../lib/schemas/sets";
import { addWords } from "../../../../lib/services/sets/addWords";
import type { WordsAddResponseDTO, ApiErrorDTO } from "../../../../types";

// Disable prerendering for this dynamic route
export const prerender = false;

/**
 * POST /api/sets/{setId}/words
 *
 * Adds 1-5 new words to an existing set.
 *
 * URL Parameters:
 * - setId: UUID of the set to add words to
 *
 * Request Body:
 * - words: Array of 1-5 words, each with pl (Polish) and en (English) fields
 *
 * Returns:
 * - 201: Words successfully added with WordsAddResponseDTO
 * - 400: Invalid setId or request body
 * - 401: Unauthenticated (no user session)
 * - 404: Set not found or doesn't belong to user
 * - 409: Duplicate English word in set
 * - 422: Too many words (>5) or validation failed
 * - 500: Server error
 */
export const POST: APIRoute = async (context) => {
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

    // Get user ID from authentication middleware
    const userId = context.locals.user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        } satisfies ApiErrorDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

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
      validatedCommand = wordsAddCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;

        // Check for words array size validation
        const wordsError = errors.find((e) => e.path.includes("words"));
        if (wordsError && wordsError.code === "too_big") {
          return new Response(
            JSON.stringify({
              error: {
                code: "WORDS_LIMIT_EXCEEDED",
                message: "Maximum 5 words allowed per request.",
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
              code: "INVALID_BODY",
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

    // Call service to add words
    try {
      const result = await addWords(supabase, userId, setId, validatedCommand);

      // Return successful response with 201 Created
      const response: WordsAddResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error: any) {
      // Handle specific service errors
      if (error.code === "SET_NOT_FOUND") {
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

      if (error.code === "WORD_DUPLICATE") {
        return new Response(
          JSON.stringify({
            error: {
              code: "WORD_DUPLICATE",
              message: error.message,
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Re-throw to be caught by outer catch
      throw error;
    }
  } catch (error) {
    // Log error for debugging
    console.error("Error in POST /api/sets/{setId}/words:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add words to set.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};
