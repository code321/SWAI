import { z } from "zod";
import { uuidSchema } from "./sets";

// ---------------------------------------------------------------------------
// POST /api/sets/{setId}/generate - Trigger generation
// ---------------------------------------------------------------------------

/**
 * Schema for X-Idempotency-Key header validation.
 * Required for ensuring idempotent generation requests.
 * Format: user-scoped unique string (e.g., uuid or date-based key)
 */
export const idempotencyKeyHeaderSchema = z.object({
  "x-idempotency-key": z.string().min(1, "X-Idempotency-Key header is required").max(255, "Idempotency key too long"),
});

/**
 * Schema for optional X-Request-Id header validation.
 * Used for request tracing and logging correlation.
 */
export const requestIdHeaderSchema = z.object({
  "x-request-id": z.string().max(255, "Request ID too long").optional(),
});

/**
 * Combined schema for all generation-related headers.
 * Merges idempotency key (required) and request ID (optional).
 */
export const generationHeadersSchema = idempotencyKeyHeaderSchema.merge(requestIdHeaderSchema);

export type GenerationHeadersSchema = z.infer<typeof generationHeadersSchema>;

/**
 * Schema for validating POST /api/sets/{setId}/generate request body.
 *
 * Validates:
 * - model_id: AI model identifier (required, format: provider/model-name)
 * - temperature: Sampling temperature (required, 0-2 range)
 * - prompt_version: Version of the prompt template (required, semver format)
 */
export const setGenerationCommandSchema = z.object({
  model_id: z.string().min(1, "Model ID is required").max(100, "Model ID too long"),
  // .min(1, "Model ID is required")
  // .max(100, "Model ID too long"),
  // .regex(/^[\w-]+\/[\w.-]+$/, "Model ID must follow format: provider/model-name"),
  temperature: z.number().min(0, "Temperature must be at least 0").max(2, "Temperature must be at most 2"),
  prompt_version: z
    .string()
    .min(1, "Prompt version is required")
    .max(20, "Prompt version too long")
    .regex(/^v\d+\.\d+\.\d+$/, "Prompt version must follow semver format (e.g., v1.0.0)"),
});

export type SetGenerationCommandSchema = z.infer<typeof setGenerationCommandSchema>;

/**
 * Schema for validating setId URL parameter in generation endpoint.
 */
export const generationSetIdParamSchema = z.object({
  setId: uuidSchema,
});

export type GenerationSetIdParamSchema = z.infer<typeof generationSetIdParamSchema>;
