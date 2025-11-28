import type { APIRoute } from 'astro';
import { ZodError } from 'zod';

import { sessionIdParamSchema } from '../../../lib/schemas/sessions';
import { getSession } from '../../../lib/services/sessions/getSession';
import { toApiError } from '../../../lib/utils';
import type { SessionDetailDTO, ApiErrorDTO } from '../../../types';

export const prerender = false;

/**
 * GET /api/sessions/{sessionId}
 * 
 * Retrieves details of an exercise session including progress and sentences.
 * Shows current state of the session (active or finished) with attempt statistics.
 * 
 * Path Parameters:
 * - sessionId: UUID of the session (required)
 * 
 * Returns:
 * - 200: Session details with SessionDetailDTO
 * - 400: Invalid sessionId format
 * - 401: Not authenticated
 * - 404: Session not found or access denied
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

    // Call service to get session details
    try {
      const result = await getSession(supabase, userId, validatedParams.sessionId);

      // Return successful response
      const response: SessionDetailDTO = result;

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
    console.error('Error in GET /api/sessions/{sessionId}:', error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to retrieve session.',
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};

