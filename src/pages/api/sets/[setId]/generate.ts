import type { APIRoute } from "astro";
import { ZodError } from "zod";

import {
  generationSetIdParamSchema,
  setGenerationCommandSchema,
  generationHeadersSchema,
} from "../../../../lib/schemas/generation";
import { triggerGeneration } from "../../../../lib/services/generation/triggerGeneration";
import type { ApiErrorDTO, GenerationResponseDTO, MessageResponse } from "../../../../types";

// Disable prerendering for this dynamic route
export const prerender = false;

/**
 * POST /api/sets/{setId}/generate
 *
 * Triggers sentence generation for all words in a set.
 *
 * URL Parameters:
 * - setId: UUID of the set to generate sentences for
 *
 * Headers:
 * - X-Idempotency-Key: Required. Unique key for idempotent requests (user-scoped)
 * - X-Request-Id: Optional. Request ID for tracing and logging
 *
 * Request Body:
 * - model_id: AI model identifier (format: provider/model-name)
 * - temperature: Sampling temperature (0-2)
 * - prompt_version: Prompt template version (semver format, e.g., v1.0.0)
 *
 * Returns:
 * - 200: Generation completed successfully with GenerationResponseDTO
 * - 202: Generation queued (async mode) with MessageResponse<"GENERATION_STARTED">
 * - 400: Invalid request (validation error)
 * - 401: Unauthorized (no valid session)
 * - 403: Daily generation limit reached (≥10 generations today)
 * - 404: Set not found or access denied
 * - 409: Duplicate idempotency key
 * - 422: Set has no words
 * - 429: Rate limit exceeded
 * - 500: Server error
 * - 502: LLM service error
 */
export const POST: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware

    console.log("generate route called");
    console.log("context request", context.request);

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
    // For now, using placeholder
    const userId = "bec776c2-538f-4375-a91e-03aba1adfbfa";

    // Validate setId parameter
    let setId: string;
    try {
      const validated = generationSetIdParamSchema.parse({ setId: context.params.setId });

      console.log("validated", validated);
      console.log("validated.setId", validated.setId);

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

    // Validate required headers
    console.log("validating required headers");
    console.log("context.request.headers", context.request.headers);
    let idempotencyKey: string;
    try {
      const headers = Object.fromEntries(
        Array.from(context.request.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
      );
      const validated = generationHeadersSchema.parse(headers);
      idempotencyKey = validated["x-idempotency-key"];
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;
        const idempotencyError = errors.find((e) => e.path.includes("x-idempotency-key"));

        console.log("idempotencyError", idempotencyError);

        if (idempotencyError) {
          return new Response(
            JSON.stringify({
              error: {
                code: "MISSING_IDEMPOTENCY_KEY",
                message: "X-Idempotency-Key header is required.",
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_HEADERS",
              message: `Header validation failed: ${errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
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

    console.log("parsing request body");

    let body;
    try {
      body = await context.request.json();
      console.log("body", body);
    } catch (error) {
      console.log("error", error);
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

    console.log("validating request body");
    console.log("body", body);
    console.log("body.model_id", body.model_id);
    console.log("body.temperature", body.temperature);
    console.log("body.prompt_version", body.prompt_version);
    // Validate request body
    let validatedCommand;
    try {
      console.log("parsing request body");
      validatedCommand = setGenerationCommandSchema.parse(body);
      console.log("validatedCommand", validatedCommand);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;

        console.log("errors", errors);

        // Check for model_id validation
        // const modelError = errors.find((e) => e.path.includes("model_id"));
        // if (modelError) {
        //   return new Response(
        //     JSON.stringify({
        //       error: {
        //         code: "INVALID_MODEL_ID",
        //         message: modelError.message,
        //       },
        //     } satisfies ApiErrorDTO),
        //     {
        //       status: 400,
        //       headers: { "Content-Type": "application/json; charset=utf-8" },
        //     }
        //   );
        // }

        // Check for temperature validation
        const tempError = errors.find((e) => e.path.includes("temperature"));
        if (tempError) {
          return new Response(
            JSON.stringify({
              error: {
                code: "INVALID_TEMPERATURE",
                message: "Temperature must be a number between 0 and 2.",
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          );
        }

        // Check for prompt_version validation
        const versionError = errors.find((e) => e.path.includes("prompt_version"));
        if (versionError) {
          return new Response(
            JSON.stringify({
              error: {
                code: "INVALID_PROMPT_VERSION",
                message: versionError.message,
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

    // Call service to trigger generation
    try {
      // Get OpenRouter API key from environment
      const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        console.error("OPENROUTER_API_KEY is not configured");
        return new Response(
          JSON.stringify({
            error: {
              code: "SERVER_ERROR",
              message: "LLM service is not configured.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      const result = await triggerGeneration(
        supabase,
        userId,
        setId,
        validatedCommand,
        idempotencyKey,
        openRouterApiKey
      );

      // Return successful response (synchronous generation)
      const response: GenerationResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error: any) {
      // Handle specific service errors
      if (error.code === "SET_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: {
              code: "SET_NOT_FOUND",
              message: "Set not found or access denied.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 404,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (error.code === "SET_HAS_NO_WORDS") {
        return new Response(
          JSON.stringify({
            error: {
              code: "SET_HAS_NO_WORDS",
              message: "Cannot generate sentences for an empty set. Add words first.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 422,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (error.code === "DAILY_LIMIT_REACHED") {
        return new Response(
          JSON.stringify({
            error: {
              code: "DAILY_LIMIT_REACHED",
              message: "Daily generation limit reached (10 generations per day).",
            },
          } satisfies ApiErrorDTO),
          {
            status: 403,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      if (error.code === "DUPLICATE_IDEMPOTENCY_KEY") {
        return new Response(
          JSON.stringify({
            error: {
              code: "DUPLICATE_IDEMPOTENCY_KEY",
              message: "This idempotency key has already been used.",
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Handle OpenRouter-specific errors
      if (error.code && error.code.startsWith("OPENROUTER_")) {
        const statusCode = error.code === "OPENROUTER_RATE_LIMIT" ? 429 : 502;

        return new Response(
          JSON.stringify({
            error: {
              code: error.code,
              message: error.message || "LLM service error.",
            },
          } satisfies ApiErrorDTO),
          {
            status: statusCode,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      // Re-throw to be caught by outer catch
      throw error;
    }
  } catch (error) {
    // Log error for debugging
    console.error("Error in POST /api/sets/{setId}/generate:", error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: "SERVER_ERROR",
          message: "Failed to trigger generation.",
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
};
