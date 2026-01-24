import { z } from "zod";

// ---------------------------------------------------------------------------
// Common schemas
// ---------------------------------------------------------------------------

/**
 * CEFR level enum schema (A1-C2)
 */
export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid({ message: "Must be a valid UUID" });

// ---------------------------------------------------------------------------
// GET /api/sets - List sets
// ---------------------------------------------------------------------------

/**
 * Zod schema for validating query parameters for GET /api/sets endpoint.
 *
 * Validates:
 * - search: optional string for name prefix filtering
 * - level: optional CEFR level enum (A1-C2)
 * - cursor: optional cursor string for pagination (format: timestamp|uuid)
 * - limit: optional number between 1 and 50 (defaults to 10)
 * - sort: optional sort order (created_at_desc or name_asc)
 */
export const listSetsQuerySchema = z.object({
  search: z.string().optional(),
  level: cefrLevelSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["created_at_desc", "name_asc"]).default("created_at_desc"),
});

export type ListSetsQuerySchema = z.infer<typeof listSetsQuerySchema>;

// ---------------------------------------------------------------------------
// POST /api/sets - Create set
// ---------------------------------------------------------------------------

/**
 * Schema for a single word when creating a set.
 *
 * Validates:
 * - pl: Polish word/phrase (required, 1-200 chars)
 * - en: English translation (required, 1-200 chars, trimmed, not only whitespace)
 */
export const wordCreateInputSchema = z.object({
  pl: z.string().min(1, "Polish word is required").max(200, "Polish word too long"),
  en: z
    .string()
    .min(1, "English word is required")
    .max(200, "English word too long")
    .trim()
    .refine((val) => val.length > 0, "English word cannot be only whitespace"),
});

/**
 * Schema for validating POST /api/sets request body.
 *
 * Validates:
 * - name: Set name (required, 1-100 chars, unique per user)
 * - level: CEFR level (required)
 * - timezone: User timezone (required, IANA format)
 * - words: Array of 1-5 words (required)
 */
export const setCreateCommandSchema = z.object({
  name: z.string().min(1, "Set name is required").max(100, "Set name too long").trim(),
  level: cefrLevelSchema,
  timezone: z.string().min(1, "Timezone is required"),
  words: z
    .array(wordCreateInputSchema)
    .min(1, "At least one word is required")
    .max(5, "Maximum 5 words allowed per set"),
});

export type SetCreateCommandSchema = z.infer<typeof setCreateCommandSchema>;

// ---------------------------------------------------------------------------
// GET /api/sets/{setId} - Get single set
// ---------------------------------------------------------------------------

/**
 * Schema for validating setId URL parameter.
 */
export const setIdParamSchema = z.object({
  setId: uuidSchema,
});

export type SetIdParamSchema = z.infer<typeof setIdParamSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/sets/{setId} - Update set
// ---------------------------------------------------------------------------

/**
 * Schema for a single word when updating a set.
 * Includes optional id for identifying existing words.
 *
 * Validates:
 * - id: Optional UUID (if provided, updates existing word; if not, creates new)
 * - pl: Polish word/phrase (required, 1-200 chars)
 * - en: English translation (required, 1-200 chars, trimmed)
 */
export const wordUpsertInputSchema = z.object({
  id: uuidSchema.optional(),
  pl: z.string().min(1, "Polish word is required").max(200, "Polish word too long"),
  en: z
    .string()
    .min(1, "English word is required")
    .max(200, "English word too long")
    .trim()
    .refine((val) => val.length > 0, "English word cannot be only whitespace"),
});

/**
 * Schema for validating PATCH /api/sets/{setId} request body.
 * All fields are optional (partial update).
 *
 * Validates:
 * - name: Optional new set name (1-100 chars, unique per user)
 * - level: Optional new CEFR level
 * - words: Optional array of 1-5 words (replaces entire collection)
 */
export const setUpdateCommandSchema = z
  .object({
    name: z.string().min(1, "Set name cannot be empty").max(100, "Set name too long").trim().optional(),
    level: cefrLevelSchema.optional(),
    words: z
      .array(wordUpsertInputSchema)
      .min(1, "At least one word is required")
      .max(5, "Maximum 5 words allowed per set")
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.level !== undefined || data.words !== undefined,
    "At least one field (name, level, or words) must be provided"
  );

export type SetUpdateCommandSchema = z.infer<typeof setUpdateCommandSchema>;

// ---------------------------------------------------------------------------
// POST /api/sets/{setId}/words - Add words to set
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/sets/{setId}/words request body.
 * Allows adding 1-5 new words to an existing set.
 *
 * Validates:
 * - words: Array of 1-5 words (required)
 * - Each word must have pl and en fields (1-200 chars each)
 * - English words are normalized for duplicate detection
 */
export const wordsAddCommandSchema = z.object({
  words: z
    .array(wordCreateInputSchema)
    .min(1, "At least one word is required")
    .max(5, "Maximum 5 words allowed per request"),
});

export type WordsAddCommandSchema = z.infer<typeof wordsAddCommandSchema>;

// ---------------------------------------------------------------------------
// PATCH /api/sets/{setId}/words/{wordId} - Update word
// ---------------------------------------------------------------------------

/**
 * Schema for validating wordId URL parameter.
 */
export const wordIdParamSchema = z.object({
  wordId: uuidSchema,
});

export type WordIdParamSchema = z.infer<typeof wordIdParamSchema>;

/**
 * Schema for validating PATCH /api/sets/{setId}/words/{wordId} request body.
 * All fields are optional (partial update).
 * At least one field must be provided.
 *
 * Validates:
 * - pl: Optional new Polish word/phrase (1-200 chars)
 * - en: Optional new English translation (1-200 chars, trimmed)
 */
export const wordUpdateCommandSchema = z
  .object({
    pl: z.string().min(1, "Polish word cannot be empty").max(200, "Polish word too long").trim().optional(),
    en: z
      .string()
      .min(1, "English word cannot be empty")
      .max(200, "English word too long")
      .trim()
      .refine((val) => !val || val.length > 0, "English word cannot be only whitespace")
      .optional(),
  })
  .refine((data) => data.pl !== undefined || data.en !== undefined, "At least one field (pl or en) must be provided");

export type WordUpdateCommandSchema = z.infer<typeof wordUpdateCommandSchema>;
