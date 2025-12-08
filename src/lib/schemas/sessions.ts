import { z } from 'zod';
import { uuidSchema } from './sets';

// ---------------------------------------------------------------------------
// POST /api/sessions - Create session
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/sessions request body.
 * 
 * Validates:
 * - set_id: UUID of the set to practice (required)
 * - generation_id: UUID of specific generation to use (optional, defaults to latest)
 * - mode: Exercise mode (only "translate" supported in MVP)
 */
export const sessionCreateCommandSchema = z.object({
  set_id: uuidSchema,
  generation_id: uuidSchema.optional(),
  mode: z.literal('translate', {
    errorMap: () => ({ message: 'Only "translate" mode is supported in MVP' }),
  }),
});

export type SessionCreateCommandSchema = z.infer<typeof sessionCreateCommandSchema>;

// ---------------------------------------------------------------------------
// GET /api/sessions/{sessionId} - Get session
// ---------------------------------------------------------------------------

/**
 * Schema for validating sessionId URL parameter.
 */
export const sessionIdParamSchema = z.object({
  sessionId: uuidSchema,
});

export type SessionIdParamSchema = z.infer<typeof sessionIdParamSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/sessions/{sessionId}/finish - Finish session
// ---------------------------------------------------------------------------

/**
 * Schema for validating PATCH /api/sessions/{sessionId}/finish request body.
 * 
 * Validates:
 * - completed_reason: Reason why the session ended (required)
 *   Common values: "all_sentences_answered", "abandoned", "manual_exit"
 */
export const sessionFinishCommandSchema = z.object({
  completed_reason: z.string()
    .min(1, 'Completed reason is required')
    .max(100, 'Completed reason too long'),
});

export type SessionFinishCommandSchema = z.infer<typeof sessionFinishCommandSchema>;




