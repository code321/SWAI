import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { setIdParamSchema, wordIdParamSchema, wordUpdateCommandSchema } from "../../../../../lib/schemas/sets";
import { updateWord } from "../../../../../lib/services/sets/updateWord";
import { deleteWord } from "../../../../../lib/services/sets/deleteWord";
import type { WordUpdateResponseDTO, WordDeleteResponseDTO, ApiErrorDTO } from "../../../../../types";

// Disable prerendering for this dynamic route
export const prerender = false;

/**
 * PATCH /api/sets/{setId}/words/{wordId}
 *
 * Updates an existing word's translations (pl and/or en).
 * All fields in request body are optional (partial update).
 *
 * URL Parameters:
 * - setId: UUID of the set containing the word
 * - wordId: UUID of the word to update
 *
 * Request Body (at least one field required):
 * - pl: Optional new Polish word/phrase (1-200 chars)
 * - en: Optional new English translation (1-200 chars)
 *
 * Returns:
 * - 200: Successfully updated with WordUpdateResponseDTO (WordDTO)
 * - 400: Invalid UUID or request body
 * - 401: Unauthenticated (no user session)
 * - 404: Word not found or doesn't belong to user's set
 * - 409: Duplicate English word in set
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

    // Validate wordId parameter
    let wordId: string;
    try {
      const validated = wordIdParamSchema.parse({ wordId: context.params.wordId });
      wordId = validated.wordId;
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_WORD_ID",
              message: "wordId must be a valid UUID.",
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
      validatedCommand = wordUpdateCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;

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

    // Call service to update word
    try {
      const result = await updateWord(supabase, userId, setId, wordId, validatedCommand);

      // Return 404 if word not found
      if (!result) {
        return new Response(
          JSON.stringify({
            error: {
              code: "WORD_NOT_FOUND",
              message: "Word not found.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Return successful response
      const response: WordUpdateResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error: any) {
      // Handle specific service errors
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
    console.error("Error in PATCH /api/sets/{setId}/words/{wordId}:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update word.",
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
 * DELETE /api/sets/{setId}/words/{wordId}
 *
 * Permanently deletes a word from a set and updates words_count.
 *
 * URL Parameters:
 * - setId: UUID of the set containing the word
 * - wordId: UUID of the word to delete
 *
 * Returns:
 * - 200: Successfully deleted with WordDeleteResponseDTO
 * - 400: Invalid UUID
 * - 401: Unauthenticated (no user session)
 * - 404: Word not found
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

    // Validate wordId parameter
    let wordId: string;
    try {
      const validated = wordIdParamSchema.parse({ wordId: context.params.wordId });
      wordId = validated.wordId;
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_WORD_ID",
              message: "wordId must be a valid UUID.",
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

    // Call service to delete word
    const result = await deleteWord(supabase, userId, setId, wordId);

    // Handle service result
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "WORD_NOT_FOUND",
            message: "Word not found.",
          },
        } satisfies ApiErrorDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Return successful response
    const response: WordDeleteResponseDTO = result.data;

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in DELETE /api/sets/{setId}/words/{wordId}:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete word.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};
