import { z } from "zod";

/**
 * Authentication-related Zod schemas for input validation
 * All schemas validate data before it reaches Supabase Auth
 */

// ---------------------------------------------------------------------------
// Common schemas
// ---------------------------------------------------------------------------

/**
 * Email validation schema
 * Ensures valid email format
 */
export const emailSchema = z.string().email({ message: "Podaj poprawny adres email" }).trim();

/**
 * Password validation schema
 * Minimum 8 characters as per PRD requirements
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Hasło musi mieć minimum 8 znaków" })
  .max(255, { message: "Hasło jest za długie" });

/**
 * Timezone validation schema
 * Validates IANA timezone format
 */
export const timezoneSchema = z.string().min(1, { message: "Timezone jest wymagany" });

// ---------------------------------------------------------------------------
// POST /api/auth/login - Login
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/auth/login request body
 *
 * Validates:
 * - email: Valid email format
 * - password: Minimum 8 characters
 */
export const authLoginCommandSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type AuthLoginCommandSchema = z.infer<typeof authLoginCommandSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/signup - Registration
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/auth/signup request body
 *
 * Validates:
 * - email: Valid email format
 * - password: Minimum 8 characters
 * - data.timezone: IANA timezone string (auto-collected from browser)
 */
export const authSignUpCommandSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  data: z.object({
    timezone: timezoneSchema,
  }),
});

export type AuthSignUpCommandSchema = z.infer<typeof authSignUpCommandSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/recover - Password recovery
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/auth/recover request body
 *
 * Validates:
 * - email: Valid email format
 */
export const authRecoverCommandSchema = z.object({
  email: emailSchema,
});

export type AuthRecoverCommandSchema = z.infer<typeof authRecoverCommandSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password - Reset password
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/auth/reset-password request body
 * Used after user clicks recovery link and exchanges tokens
 *
 * Validates:
 * - password: New password (minimum 8 characters)
 */
export const authResetPasswordCommandSchema = z.object({
  password: passwordSchema,
});

export type AuthResetPasswordCommandSchema = z.infer<typeof authResetPasswordCommandSchema>;

// ---------------------------------------------------------------------------
// POST /api/auth/exchange - Exchange recovery tokens for session
// ---------------------------------------------------------------------------

/**
 * Schema for validating POST /api/auth/exchange request body
 * Used to exchange recovery tokens from email link into HttpOnly cookies
 *
 * Validates:
 * - accessToken: JWT access token from recovery link
 * - refreshToken: JWT refresh token from recovery link
 */
export const authExchangeCommandSchema = z.object({
  accessToken: z.string().min(1, { message: "Access token jest wymagany" }),
  refreshToken: z.string().min(1, { message: "Refresh token jest wymagany" }),
});

export type AuthExchangeCommandSchema = z.infer<typeof authExchangeCommandSchema>;
