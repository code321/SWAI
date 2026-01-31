import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  timezoneSchema,
  authLoginCommandSchema,
  authSignUpCommandSchema,
  authRecoverCommandSchema,
  authResetPasswordCommandSchema,
  authExchangeCommandSchema,
} from "@/lib/schemas/auth";

describe("Auth Schemas", () => {
  describe("emailSchema", () => {
    it("should validate correct email", () => {
      const result = emailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
    });

    it("should reject email with whitespace", () => {
      const result = emailSchema.safeParse("  test@example.com  ");
      // Email validation happens before trim, so this should fail
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const result = emailSchema.safeParse("invalid-email");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Podaj poprawny adres email");
      }
    });

    it("should reject empty string", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("should validate password with minimum 8 characters", () => {
      const result = passwordSchema.safeParse("password123");
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = passwordSchema.safeParse("short");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi mieć minimum 8 znaków");
      }
    });

    it("should reject password longer than 255 characters", () => {
      const longPassword = "a".repeat(256);
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło jest za długie");
      }
    });

    it("should accept password exactly 8 characters", () => {
      const result = passwordSchema.safeParse("12345678");
      expect(result.success).toBe(true);
    });
  });

  describe("timezoneSchema", () => {
    it("should validate valid timezone", () => {
      const result = timezoneSchema.safeParse("Europe/Warsaw");
      expect(result.success).toBe(true);
    });

    it("should reject empty timezone", () => {
      const result = timezoneSchema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Timezone jest wymagany");
      }
    });
  });

  describe("authLoginCommandSchema", () => {
    it("should validate valid login data", () => {
      const result = authLoginCommandSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = authLoginCommandSchema.safeParse({
        email: "invalid",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = authLoginCommandSchema.safeParse({
        email: "test@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = authLoginCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("authSignUpCommandSchema", () => {
    it("should validate valid signup data", () => {
      const result = authSignUpCommandSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        data: {
          timezone: "Europe/Warsaw",
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing timezone", () => {
      const result = authSignUpCommandSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        data: {},
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const result = authSignUpCommandSchema.safeParse({
        email: "not-an-email",
        password: "password123",
        data: {
          timezone: "Europe/Warsaw",
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("authRecoverCommandSchema", () => {
    it("should validate valid recovery data", () => {
      const result = authRecoverCommandSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = authRecoverCommandSchema.safeParse({
        email: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("authResetPasswordCommandSchema", () => {
    it("should validate valid password", () => {
      const result = authResetPasswordCommandSchema.safeParse({
        password: "newpassword123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject short password", () => {
      const result = authResetPasswordCommandSchema.safeParse({
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("authExchangeCommandSchema", () => {
    it("should validate valid tokens", () => {
      const result = authExchangeCommandSchema.safeParse({
        accessToken: "valid-access-token",
        refreshToken: "valid-refresh-token",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty access token", () => {
      const result = authExchangeCommandSchema.safeParse({
        accessToken: "",
        refreshToken: "valid-refresh-token",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty refresh token", () => {
      const result = authExchangeCommandSchema.safeParse({
        accessToken: "valid-access-token",
        refreshToken: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing tokens", () => {
      const result = authExchangeCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
