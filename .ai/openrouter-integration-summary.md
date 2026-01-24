# OpenRouter Integration Summary

## Overview

Successfully integrated the OpenRouter service with the sentence generation flow to enable LLM-powered sentence generation from word sets.

## Changes Made

### 1. Updated `triggerGeneration.ts`

**File:** `src/lib/services/generation/triggerGeneration.ts`

**Changes:**
- Added OpenRouter service integration for LLM sentence generation
- Created `CodedError` class for proper error handling without `any` types
- Modified function signature to accept `openRouterApiKey` parameter
- Replaced placeholder sentence generation with actual LLM API calls
- Added proper error handling for OpenRouter API errors
- Updated generation run records with actual token usage and costs
- Improved mapping of generated sentences to words by English text matching

**Key Features:**
- Calls OpenRouter LLM with words snapshot
- Generates natural Polish sentences containing English words
- Updates database with actual token usage and cost data
- Proper error propagation with specific error codes
- Fallback word mapping if exact match not found

### 2. Updated Generation API Endpoint

**File:** `src/pages/api/sets/[setId]/generate.ts`

**Changes:**
- Added retrieval of `OPENROUTER_API_KEY` from environment variables
- Added validation to ensure API key is configured
- Passed API key to `triggerGeneration` service function
- Added error handling for OpenRouter-specific errors
- Maps OpenRouter errors to appropriate HTTP status codes (429 for rate limit, 502 for other LLM errors)

### 3. Type Safety Improvements

- Added `Json` type import from database types
- Created `CodedError` class to replace `any` type assertions
- Properly typed `SentenceRecord` interface for nested Supabase queries
- Used `unknown` intermediate type for safe type casting

## API Flow

1. **Request:** Client sends POST to `/api/sets/{setId}/generate` with:
   - `model_id`: OpenRouter model identifier (e.g., "openai/gpt-4")
   - `temperature`: Generation temperature (0-2)
   - `prompt_version`: Prompt template version
   - `X-Idempotency-Key` header

2. **Validation:**
   - Verify set exists and user owns it
   - Check set has words
   - Enforce daily generation limit (10/day)
   - Check idempotency key

3. **LLM Generation:**
   - Create OpenRouter service instance
   - Send words to LLM with structured output schema
   - Receive generated Polish sentences with English words

4. **Database Updates:**
   - Create generation run record
   - Update with actual token usage and cost
   - Insert generated sentences linked to words
   - Log event to event_log

5. **Response:**
   - Return generated sentences
   - Include usage statistics (tokens, cost)
   - Show remaining generations for the day

## Error Handling

### Service Layer Errors
- `SET_NOT_FOUND`: Set doesn't exist or user doesn't have access
- `SET_HAS_NO_WORDS`: Cannot generate for empty set
- `DAILY_LIMIT_REACHED`: User exceeded 10 generations per day
- `DUPLICATE_IDEMPOTENCY_KEY`: Idempotency key already used
- `OPENROUTER_*`: Various OpenRouter API errors

### API Response Codes
- `200`: Success with generated sentences
- `400`: Invalid request parameters
- `401`: Unauthorized (no session)
- `403`: Daily limit reached
- `404`: Set not found
- `409`: Duplicate idempotency key
- `422`: Set has no words
- `429`: OpenRouter rate limit
- `500`: Server error
- `502`: LLM service error

## Configuration

Requires environment variable:
- `OPENROUTER_API_KEY`: OpenRouter API key for LLM calls

Already defined in `src/env.d.ts`.

## Usage Example

```typescript
// POST /api/sets/{setId}/generate
{
  "model_id": "openai/gpt-4",
  "temperature": 0.7,
  "prompt_version": "v1.0.0"
}

// Headers
X-Idempotency-Key: unique-key-123

// Response
{
  "generation_id": "uuid",
  "set_id": "uuid",
  "occurred_at": "2026-01-10T...",
  "sentences": [
    {
      "sentence_id": "uuid",
      "word_id": "uuid",
      "pl_text": "To jest przykładowe Polish sentence z word.",
      "target_en": "word"
    }
  ],
  "usage": {
    "tokens_in": 150,
    "tokens_out": 200,
    "cost_usd": 0.015,
    "remaining_generations_today": 9
  }
}
```

## Next Steps

1. Configure `OPENROUTER_API_KEY` in environment variables
2. Test generation with real OpenRouter API
3. Monitor token usage and costs
4. Consider implementing cost alerts for high usage
5. Add model selection UI in frontend
6. Test error handling for various OpenRouter error scenarios

## Notes

- Service creates generation run record before LLM call to ensure database consistency
- Updates record with actual usage after successful generation
- Implements idempotency to prevent duplicate generations
- Maps generated sentences to words by matching English text (case-insensitive)
- Falls back to first word if no exact match found
- All console logging statements are properly marked with eslint-disable comments
