import type { APIRoute } from 'astro';
import { ZodError } from 'zod';

import { listSetsQuerySchema, setCreateCommandSchema } from '../../lib/schemas/sets';
import { listSets } from '../../lib/services/sets/listSets';
import { createSet } from '../../lib/services/sets/createSet';
import type { SetsListResponseDTO, SetCreateResponseDTO, ApiErrorDTO } from '../../types';

/**
 * GET /api/sets
 * 
 * Returns a paginated list of sets for a user.
 * Supports filtering by name prefix, CEFR level, sorting, and cursor-based pagination.
 * 
 * Query Parameters:
 * - search (optional): Name prefix filter
 * - level (optional): CEFR level filter (A1-C2)
 * - cursor (optional): Pagination cursor (format: timestamp|uuid)
 * - limit (optional): Number of results (1-50, default: 10)
 * - sort (optional): Sort order (created_at_desc | name_asc, default: created_at_desc)
 * 
 * Returns:
 * - 200: Success with SetsListResponseDTO
 * - 400: Invalid query parameters
 * - 500: Server error
 * 
 * Note: Authentication will be implemented later via middleware.
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
    // For now, using a placeholder - this will be replaced with actual auth
    const userId = '14cf5f38-c354-400a-be38-069e4cd41855'; // This will come from auth middleware later

    // Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = {
      search: url.searchParams.get('search') || undefined,
      level: url.searchParams.get('level') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      sort: url.searchParams.get('sort') || undefined,
    };

    let validatedQuery;
    try {

      validatedQuery = listSetsQuerySchema.parse(queryParams);

    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_QUERY',
              message: `Invalid query parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
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

    // Call service to retrieve sets
    const result = await listSets(supabase, userId, validatedQuery);

    // Return successful response
    const response: SetsListResponseDTO = {
      data: result.data,
      pagination: result.pagination,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    // Log error for debugging
    console.error('Error in GET /api/sets:', error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVER_ERROR',
          message: 'Unexpected server error.',
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};

/**
 * POST /api/sets
 * 
 * Creates a new set with 1-5 initial words.
 * Enforces unique set name per user and validates CEFR level.
 * 
 * Request Body:
 * - name: Set name (1-100 chars, unique per user)
 * - level: CEFR level (A1-C2)
 * - timezone: User timezone (IANA format)
 * - words: Array of 1-5 words with pl, en, and optional position
 * 
 * Returns:
 * - 201: Successfully created set with SetCreateResponseDTO
 * - 400: Invalid request body
 * - 409: Duplicate set name
 * - 422: Too many words or duplicate English words
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
console.log("userId", userId);
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

    // Validate request body
    let validatedCommand;
    try {
      validatedCommand = setCreateCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        // Check for specific validation errors
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

        // Check for invalid CEFR level
        const levelError = errors.find(e => e.path.includes('level'));
        if (levelError) {
          return new Response(
            JSON.stringify({
              error: {
                code: 'INVALID_CEFR_LEVEL',
                message: 'level must be one of A1, A2, B1, B2, C1, C2.',
              },
            } satisfies ApiErrorDTO),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }

        // Check for words array validation
        const wordsError = errors.find(e => e.path.includes('words'));
        if (wordsError && wordsError.code === 'too_big') {
          return new Response(
            JSON.stringify({
              error: {
                code: 'TOO_MANY_WORDS',
                message: 'Maximum 5 words allowed per set.',
              },
            } satisfies ApiErrorDTO),
            {
              status: 422,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }

        if (wordsError && wordsError.code === 'too_small') {
          return new Response(
            JSON.stringify({
              error: {
                code: 'NO_WORDS',
                message: 'At least one word is required.',
              },
            } satisfies ApiErrorDTO),
            {
              status: 422,
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

    // Call service to create set
    try {
      const result = await createSet(supabase, userId, validatedCommand);

      // Return successful response with 201 Created
      const response: SetCreateResponseDTO = result;

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });

    } catch (error: any) {
      // Handle specific service errors
      if (error.code === 'DUPLICATE_NAME') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'DUPLICATE_NAME',
              message: 'Set with this name already exists.',
            },
          } satisfies ApiErrorDTO),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }

      if (error.code === 'DUPLICATE_ENGLISH_WORD') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'DUPLICATE_ENGLISH_WORD',
              message: error.message,
            },
          } satisfies ApiErrorDTO),
          {
            status: 422,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }

      // Re-throw to be caught by outer catch
      throw error;
    }

  } catch (error) {
    // Log error for debugging
    console.error('Error in POST /api/sets:', error);

    // Return generic server error
    return new Response(
      JSON.stringify({
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create set.',
        },
      } satisfies ApiErrorDTO),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};

