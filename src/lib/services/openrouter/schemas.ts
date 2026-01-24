import { z } from "zod";

/**
 * Schema for usage metrics
 */
export const usageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
});

/**
 * Schema for a single generated sentence
 */
export const sentenceSchema = z.object({
  pl_text: z.string().min(1, "Polish text cannot be empty"),
  target_en: z.string().min(1, "Target English word cannot be empty"),
});

/**
 * Schema for sentence generation content
 */
export const sentenceGenerationContentSchema = z.object({
  sentences: z.array(sentenceSchema),
});

/**
 * Schema for OpenRouter API response
 */
export const openRouterResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
        role: z.string(),
      }),
      finish_reason: z.string(),
    })
  ),
  usage: usageSchema,
});

/**
 * Validates and parses OpenRouter response
 */
export function validateOpenRouterResponse(data: unknown) {
  return openRouterResponseSchema.parse(data);
}

/**
 * Validates and parses sentence generation content
 */
export function validateSentenceGenerationContent(data: unknown) {
  return sentenceGenerationContentSchema.parse(data);
}
