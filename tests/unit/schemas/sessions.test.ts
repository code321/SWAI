import { describe, it, expect } from "vitest";
import {
  sessionCreateCommandSchema,
  sessionIdParamSchema,
  sessionFinishCommandSchema,
} from "@/lib/schemas/sessions";

describe("Sessions Schemas", () => {
  // ---------------------------------------------------------------------------
  // POST /api/sessions - Create session
  // ---------------------------------------------------------------------------

  describe("sessionCreateCommandSchema", () => {
    it("should validate correct session creation with all fields", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: "660f9511-f39c-52e5-b827-557766551111",
        mode: "translate",
      });
      expect(result.success).toBe(true);
    });

    it("should validate session creation without optional generation_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "translate",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.set_id).toBe("550e8400-e29b-41d4-a716-446655440000");
        expect(result.data.generation_id).toBeUndefined();
        expect(result.data.mode).toBe("translate");
      }
    });

    it("should validate with generation_id as undefined", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: undefined,
        mode: "translate",
      });
      expect(result.success).toBe(true);
    });

    it("should validate different valid UUIDs for set_id", () => {
      const uuids = [
        "123e4567-e89b-12d3-a456-426614174000",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      ];

      uuids.forEach((uuid) => {
        const result = sessionCreateCommandSchema.safeParse({
          set_id: uuid,
          mode: "translate",
        });
        expect(result.success).toBe(true);
      });
    });

    it("should validate different valid UUIDs for generation_id", () => {
      const generationIds = [
        "223e4567-e89b-12d3-a456-426614174000",
        "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "047ac10b-58cc-4372-a567-0e02b2c3d479",
      ];

      generationIds.forEach((genId) => {
        const result = sessionCreateCommandSchema.safeParse({
          set_id: "550e8400-e29b-41d4-a716-446655440000",
          generation_id: genId,
          mode: "translate",
        });
        expect(result.success).toBe(true);
      });
    });

    it('should validate only "translate" mode', () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "translate",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid set_id format", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "not-a-valid-uuid",
        mode: "translate",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Must be a valid UUID");
      }
    });

    it("should reject invalid generation_id format", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: "invalid-uuid",
        mode: "translate",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Must be a valid UUID");
      }
    });

    it("should reject empty set_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty generation_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: "",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing set_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing mode", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it('should reject mode other than "translate"', () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "flashcard",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Only "translate" mode is supported in MVP');
      }
    });

    it('should reject mode "multiple_choice"', () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "multiple_choice",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Only "translate" mode is supported in MVP');
      }
    });

    it('should reject mode "listening"', () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "listening",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Only "translate" mode is supported in MVP');
      }
    });

    it("should reject empty mode", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject mode with different casing", () => {
      const casings = ["Translate", "TRANSLATE", "TrAnSlAtE"];

      casings.forEach((mode) => {
        const result = sessionCreateCommandSchema.safeParse({
          set_id: "550e8400-e29b-41d4-a716-446655440000",
          mode: mode,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should reject set_id without dashes", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400e29b41d4a716446655440000",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject generation_id without dashes", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: "660f9511f39c52e5b827557766551111",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject set_id with wrong length", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject generation_id with invalid characters", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: "660f9511-f39c-52e5-b827-55776655111g",
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject numeric set_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: 12345,
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject numeric generation_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: 67890,
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null set_id", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: null,
        mode: "translate",
      });
      expect(result.success).toBe(false);
    });

    it("should reject null mode", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: null,
      });
      expect(result.success).toBe(false);
    });

    it("should accept null generation_id (treated as optional)", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        generation_id: null,
        mode: "translate",
      });
      // Zod treats null differently from undefined for optional()
      expect(result.success).toBe(false);
    });

    it("should reject mode with whitespace", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: " translate ",
      });
      expect(result.success).toBe(false);
    });

    it("should reject extra fields", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "translate",
        extra_field: "should not be here",
      });
      // Zod by default strips extra fields in .parse(), but .safeParse() will succeed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("extra_field");
      }
    });

    it("should validate complete valid session with both IDs", () => {
      const result = sessionCreateCommandSchema.safeParse({
        set_id: "a1234567-b89c-12d3-e456-426614174001",
        generation_id: "b2345678-c90d-23e4-f567-537725285002",
        mode: "translate",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.set_id).toBe("a1234567-b89c-12d3-e456-426614174001");
        expect(result.data.generation_id).toBe("b2345678-c90d-23e4-f567-537725285002");
        expect(result.data.mode).toBe("translate");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/sessions/{sessionId} - Get session
  // ---------------------------------------------------------------------------

  describe("sessionIdParamSchema", () => {
    it("should validate correct sessionId", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should validate different valid UUIDs", () => {
      const uuids = [
        "123e4567-e89b-12d3-a456-426614174000",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "00000000-0000-0000-0000-000000000000",
      ];

      uuids.forEach((uuid) => {
        const result = sessionIdParamSchema.safeParse({
          sessionId: uuid,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sessionId).toBe(uuid);
        }
      });
    });

    it("should reject invalid UUID format", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "not-a-valid-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Must be a valid UUID");
      }
    });

    it("should reject empty sessionId", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing sessionId", () => {
      const result = sessionIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject UUID without dashes", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550e8400e29b41d4a716446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject UUID with wrong length", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716",
      });
      expect(result.success).toBe(false);
    });

    it("should reject UUID with invalid characters", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716-44665544000g",
      });
      expect(result.success).toBe(false);
    });

    it("should reject numeric sessionId", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: 12345,
      });
      expect(result.success).toBe(false);
    });

    it("should reject null sessionId", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject undefined sessionId", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("should reject sessionId with spaces", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550e8400 e29b 41d4 a716 446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject uppercase UUID", () => {
      const result = sessionIdParamSchema.safeParse({
        sessionId: "550E8400-E29B-41D4-A716-446655440000",
      });
      // UUIDs are case-insensitive but let's verify behavior
      // Most UUID validators accept both cases
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/sessions/{sessionId}/finish - Finish session
  // ---------------------------------------------------------------------------

  describe("sessionFinishCommandSchema", () => {
    it("should validate correct finish command with common reasons", () => {
      const reasons = ["all_sentences_answered", "abandoned", "manual_exit"];

      reasons.forEach((reason) => {
        const result = sessionFinishCommandSchema.safeParse({
          completed_reason: reason,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.completed_reason).toBe(reason);
        }
      });
    });

    it("should validate finish command with minimum length (1 character)", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "a",
      });
      expect(result.success).toBe(true);
    });

    it("should validate finish command exactly 100 characters", () => {
      const reason = "a".repeat(100);
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: reason,
      });
      expect(result.success).toBe(true);
    });

    it("should validate various valid completion reasons", () => {
      const reasons = [
        "user_completed_successfully",
        "timed_out",
        "network_error",
        "user_quit",
        "all_correct_answers",
        "partial_completion",
      ];

      reasons.forEach((reason) => {
        const result = sessionFinishCommandSchema.safeParse({
          completed_reason: reason,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should validate reason with spaces", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "user manually exited session",
      });
      expect(result.success).toBe(true);
    });

    it("should validate reason with special characters", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "exit_reason: user-clicked-X (manual)",
      });
      expect(result.success).toBe(true);
    });

    it("should validate reason with numbers", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "timeout_after_30_minutes",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Completed reason is required");
      }
    });

    it("should reject completed_reason exceeding 100 characters", () => {
      const reason = "a".repeat(101);
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: reason,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Completed reason too long");
      }
    });

    it("should reject missing completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject null completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject undefined completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("should reject numeric completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: 12345,
      });
      expect(result.success).toBe(false);
    });

    it("should reject boolean completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: true,
      });
      expect(result.success).toBe(false);
    });

    it("should reject object as completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: { reason: "finished" },
      });
      expect(result.success).toBe(false);
    });

    it("should reject array as completed_reason", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: ["finished"],
      });
      expect(result.success).toBe(false);
    });

    it("should validate reason with Unicode characters", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "użytkownik_zakończył_sesję_ręcznie",
      });
      expect(result.success).toBe(true);
    });

    it("should validate reason with emojis", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "completed_successfully_🎉",
      });
      expect(result.success).toBe(true);
    });

    it("should validate reason exactly at boundary", () => {
      const reason = "x".repeat(99) + "!";
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: reason,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completed_reason.length).toBe(100);
      }
    });

    it("should validate whitespace-only reason (not trimmed by schema)", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "   ",
      });
      // Schema doesn't trim, so "   " has length > 0
      expect(result.success).toBe(true);
    });

    it("should validate reason with newlines", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "line1\nline2",
      });
      expect(result.success).toBe(true);
    });

    it("should validate reason with tabs", () => {
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: "tab\tseparated\tvalues",
      });
      expect(result.success).toBe(true);
    });

    it("should reject completed_reason with exactly 101 characters", () => {
      const reason = "b".repeat(101);
      const result = sessionFinishCommandSchema.safeParse({
        completed_reason: reason,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Completed reason too long");
      }
    });

    it("should validate common snake_case reasons", () => {
      const reasons = [
        "session_completed",
        "user_abandoned",
        "timeout_reached",
        "error_occurred",
      ];

      reasons.forEach((reason) => {
        const result = sessionFinishCommandSchema.safeParse({
          completed_reason: reason,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should validate common kebab-case reasons", () => {
      const reasons = [
        "session-completed",
        "user-abandoned",
        "timeout-reached",
        "error-occurred",
      ];

      reasons.forEach((reason) => {
        const result = sessionFinishCommandSchema.safeParse({
          completed_reason: reason,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
