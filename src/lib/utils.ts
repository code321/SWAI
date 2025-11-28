import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ApiErrorDTO } from "../types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps service layer errors to API error DTOs with appropriate HTTP status codes.
 * 
 * @param error - Error thrown by service layer (with optional `code` property)
 * @returns Object containing status code and ApiErrorDTO
 */
export function toApiError(error: any): { status: number; body: ApiErrorDTO } {
  const errorCode = error?.code as string | undefined;
  
  // Map known error codes to HTTP status and message
  const errorMap: Record<string, { status: number; message: string }> = {
    // Authentication & Authorization errors (401, 403, 404)
    'UNAUTHORIZED': { status: 401, message: 'Authentication required' },
    'SET_NOT_FOUND': { status: 404, message: 'Set not found or access denied' },
    'SESSION_NOT_FOUND': { status: 404, message: 'Session not found or access denied' },
    'GENERATION_NOT_FOUND': { status: 404, message: 'Generation not found or access denied' },
    'NOT_FOUND': { status: 404, message: 'Resource not found' },
    
    // Conflict errors (409)
    'SESSION_ALREADY_RUNNING': { status: 409, message: 'An active session already exists for this set' },
    'ALREADY_FINISHED': { status: 409, message: 'Session is already finished' },
    'DUPLICATE_NAME': { status: 409, message: 'Resource with this name already exists' },
    
    // Validation & Business logic errors (422)
    'NO_GENERATION_FOUND': { status: 422, message: 'No generation found for this set. Please generate sentences first.' },
    'DUPLICATE_ENGLISH_WORD': { status: 422, message: 'Duplicate English word in set' },
    
    // Bad Request errors (400)
    'INVALID_PAYLOAD': { status: 400, message: 'Invalid request payload' },
  };
  
  const mappedError = errorCode ? errorMap[errorCode] : undefined;
  
  if (mappedError) {
    return {
      status: mappedError.status,
      body: {
        error: {
          code: errorCode,
          message: mappedError.message,
        },
      },
    };
  }
  
  // Default to 500 Internal Server Error
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Unexpected server error',
      },
    },
  };
}
