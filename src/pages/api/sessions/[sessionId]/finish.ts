import type { APIRoute } from 'astro';
import { ZodError } from 'zod';

import { sessionIdParamSchema, sessionFinishCommandSchema } from '../../../../lib/schemas/sessions';
import { finishSession } from '../../../../lib/services/sessions/finishSession';
import { toApiError } from '../../../../lib/utils';
import type { SessionFinishResponseDTO, ApiErrorDTO } from '../../../../types';

export const prerender = false;

/**
 * PATCH /api/sessions/{sessionId}/finish
 * 
 * Marks an active exercise session as finished.
 * Records the completion timestamp and reason.
 * 
 * Path Parameters:
 * - sessionId: UUID of the session to finish (required)
 * 
 * Request Body:
 * - completed_reason: Reason for session completion (required)
 *   Examples: "all_sentences_answered", "abandoned", "manual_exit"
 * 
 * Returns:
 * - 200: Successfully finished session with SessionFinishResponseDTO
 * - 400: Invalid sessionId or request body
 * - 401: Not authenticated
 * - 404: Session not found or access denied
 * - 409: Session is already finished
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
            code: 'SERVER_ERROR',
            message: 'Supabase client not initialized.',
          },
        } satisfies ApiErrorDTO),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // TODO: Get user ID from authentication middleware when implemented
    const userId = '14cf5f38-c354-400a-be38-069e4cd41855'; // Placeholder

    // Validate sessionId parameter
    let validatedParams;
    try {
      validatedParams = sessionIdParamSchema.parse({
        sessionId: context.params.sessionId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_SESSION_ID',
              message: 'Invalid session ID format. Must be a valid UUID.',
            },
          } satisfies ApiErrorDTO),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body.',
          },
        } satisfies ApiErrorDTO),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // Validate request body with Zod schema
    let validatedCommand;
    try {
      validatedCommand = sessionFinishCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors;
        
        // Check for missing required fields
        const missingFields = errors
          .filter(e => e.code === 'invalid_type' && e.received === 'undefined')
          .map(e => e.path.join('.'));
        
        if (missingFields.length > 0) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'MISSING_FIELDS',
                message: `Required fields missing: ${missingFields.join(', ')}`,
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }

        // Generic validation error
        return new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Validation failed: ${errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            },
          } satisfies ApiErrorDTO),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }
      throw error;
    }

    // Call service to finish session
    try {
      const result = await finishSession(
        supabase,
        userId,
        validatedParams.sessionId,
        validatedCommand
      );

      // Return successful response
      const response: SessionFinishResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });

    } catch (error: any) {
      // Map service errors to API errors with appropriate status codes
      const apiError = toApiError(error);
      
      return new Response(
        JSON.stringify(apiError.body),
        {
          status: apiError.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

  } catch (error) {
    // Log error for debugging
    console.error('Error in PATCH /api/sessions/{sessionId}/finish:', error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to finish session.',
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};

