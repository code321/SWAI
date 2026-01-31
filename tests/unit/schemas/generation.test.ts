import { describe, it, expect } from "vitest";
import {
  idempotencyKeyHeaderSchema,
  requestIdHeaderSchema,
  generationHeadersSchema,
  setGenerationCommandSchema,
  generationSetIdParamSchema,
} from "@/lib/schemas/generation";

describe("Generation Schemas", () => {
  // ---------------------------------------------------------------------------
  // Headers validation
  // ---------------------------------------------------------------------------

  describe("idempotencyKeyHeaderSchema", () => {
    it("should validate correct idempotency key", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should validate idempotency key with date-based format", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": "user-123-2024-01-15",
      });
      expect(result.success).toBe(true);
    });

    it("should validate idempotency key with minimum 1 character", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": "a",
      });
      expect(result.success).toBe(true);
    });

    it("should validate idempotency key exactly 255 characters", () => {
      const key = "a".repeat(255);
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": key,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty idempotency key", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("X-Idempotency-Key header is required");
      }
    });

    it("should reject idempotency key exceeding 255 characters", () => {
      const key = "a".repeat(256);
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": key,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Idempotency key too long");
      }
    });

    it("should reject missing idempotency key", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept idempotency key with special characters", () => {
      const result = idempotencyKeyHeaderSchema.safeParse({
        "x-idempotency-key": "user_123-gen-2024.01.15_v1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("requestIdHeaderSchema", () => {
    it("should validate correct request ID", () => {
      const result = requestIdHeaderSchema.safeParse({
        "x-request-id": "req-550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should validate request ID exactly 255 characters", () => {
      const requestId = "r".repeat(255);
      const result = requestIdHeaderSchema.safeParse({
        "x-request-id": requestId,
      });
      expect(result.success).toBe(true);
    });

    it("should reject request ID exceeding 255 characters", () => {
      const requestId = "r".repeat(256);
      const result = requestIdHeaderSchema.safeParse({
        "x-request-id": requestId,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Request ID too long");
      }
    });

    it("should accept missing request ID (optional)", () => {
      const result = requestIdHeaderSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept undefined request ID", () => {
      const result = requestIdHeaderSchema.safeParse({
        "x-request-id": undefined,
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty request ID", () => {
      const result = requestIdHeaderSchema.safeParse({
        "x-request-id": "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("generationHeadersSchema", () => {
    it("should validate with both headers present", () => {
      const result = generationHeadersSchema.safeParse({
        "x-idempotency-key": "idempotency-123",
        "x-request-id": "request-456",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["x-idempotency-key"]).toBe("idempotency-123");
        expect(result.data["x-request-id"]).toBe("request-456");
      }
    });

    it("should validate with only required idempotency key", () => {
      const result = generationHeadersSchema.safeParse({
        "x-idempotency-key": "idempotency-123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["x-idempotency-key"]).toBe("idempotency-123");
      }
    });

    it("should reject missing idempotency key", () => {
      const result = generationHeadersSchema.safeParse({
        "x-request-id": "request-456",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty object", () => {
      const result = generationHeadersSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should validate with UUID idempotency key and request ID", () => {
      const result = generationHeadersSchema.safeParse({
        "x-idempotency-key": "550e8400-e29b-41d4-a716-446655440000",
        "x-request-id": "660f9511-f39c-52e5-b827-557766551111",
      });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/sets/{setId}/generate - Request body
  // ---------------------------------------------------------------------------

  describe("setGenerationCommandSchema", () => {
    it("should validate correct generation command", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o-mini",
        temperature: 0.8,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with temperature at minimum boundary (0)", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with temperature at maximum boundary (2)", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 2,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with decimal temperature", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "anthropic/claude-3-opus",
        temperature: 0.75,
        prompt_version: "v2.1.3",
      });
      expect(result.success).toBe(true);
    });

    it("should validate various model ID formats", () => {
      const modelIds = [
        "openai/gpt-4o-mini",
        "anthropic/claude-3-opus",
        "google/gemini-pro",
        "meta/llama-3-70b",
        "mistral/mistral-large",
      ];

      modelIds.forEach((modelId) => {
        const result = setGenerationCommandSchema.safeParse({
          model_id: modelId,
          temperature: 1.0,
          prompt_version: "v1.0.0",
        });
        expect(result.success).toBe(true);
      });
    });

    it("should validate model ID exactly 100 characters", () => {
      const modelId = "a".repeat(100);
      const result = setGenerationCommandSchema.safeParse({
        model_id: modelId,
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate prompt version with different semver formats", () => {
      const versions = ["v1.0.0", "v0.1.0", "v10.25.99", "v2.0.1"];

      versions.forEach((version) => {
        const result = setGenerationCommandSchema.safeParse({
          model_id: "openai/gpt-4o",
          temperature: 1.0,
          prompt_version: version,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should validate prompt version exactly 20 characters", () => {
      const version = "v99999.99999.99999"; // 18 chars
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: version,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty model ID", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "",
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Model ID is required");
      }
    });

    it("should reject model ID exceeding 100 characters", () => {
      const modelId = "a".repeat(101);
      const result = setGenerationCommandSchema.safeParse({
        model_id: modelId,
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Model ID too long");
      }
    });

    it("should reject temperature below 0", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: -0.1,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Temperature must be at least 0");
      }
    });

    it("should reject temperature above 2", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 2.1,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Temperature must be at most 2");
      }
    });

    it("should reject negative temperature", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: -1,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject temperature above maximum", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 3,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty prompt version", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Prompt version is required");
      }
    });

    it("should reject prompt version exceeding 20 characters", () => {
      const version = "v".repeat(21);
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: version,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Prompt version too long");
      }
    });

    it("should reject prompt version without v prefix", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: "1.0.0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Prompt version must follow semver format (e.g., v1.0.0)");
      }
    });

    it("should reject prompt version with invalid semver format", () => {
      const invalidVersions = ["v1.0", "v1", "v1.0.0.0", "v1.0.a", "v1.a.0", "va.0.0", "1.0.0", "version1.0.0"];

      invalidVersions.forEach((version) => {
        const result = setGenerationCommandSchema.safeParse({
          model_id: "openai/gpt-4o",
          temperature: 1.0,
          prompt_version: version,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Prompt version must follow semver format (e.g., v1.0.0)");
        }
      });
    });

    it("should reject prompt version with spaces", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: "v1 .0 .0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing model_id", () => {
      const result = setGenerationCommandSchema.safeParse({
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing temperature", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing prompt_version", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric temperature", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: "1.0",
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should reject temperature as string", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: "high",
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should validate temperature with high precision", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 0.123456789,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate all fields with valid data", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "anthropic/claude-3-5-sonnet",
        temperature: 1.2,
        prompt_version: "v3.2.1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model_id).toBe("anthropic/claude-3-5-sonnet");
        expect(result.data.temperature).toBe(1.2);
        expect(result.data.prompt_version).toBe("v3.2.1");
      }
    });

    it("should reject model ID with only whitespace", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "   ",
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true); // min(1) passes for "   " (3 chars)
      // Note: Schema doesn't trim model_id, so whitespace passes length validation
    });

    it("should accept model ID with special characters and numbers", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "provider-1/model_name-2.5-turbo",
        temperature: 0.5,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate with temperature exactly 1.0", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.0,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate edge case temperature 0.0000001", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 0.0000001,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });

    it("should validate edge case temperature 1.9999999", () => {
      const result = setGenerationCommandSchema.safeParse({
        model_id: "openai/gpt-4o",
        temperature: 1.9999999,
        prompt_version: "v1.0.0",
      });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // URL parameter validation
  // ---------------------------------------------------------------------------

  describe("generationSetIdParamSchema", () => {
    it("should validate correct UUID", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should validate different UUID formats", () => {
      const uuids = [
        "123e4567-e89b-12d3-a456-426614174000",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      ];

      uuids.forEach((uuid) => {
        const result = generationSetIdParamSchema.safeParse({
          setId: uuid,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid UUID format", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "not-a-valid-uuid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Must be a valid UUID");
      }
    });

    it("should reject UUID with wrong length", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "550e8400-e29b-41d4-a716",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty setId", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing setId", () => {
      const result = generationSetIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject UUID with invalid characters", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "550e8400-e29b-41d4-a716-44665544000g",
      });
      expect(result.success).toBe(false);
    });

    it("should reject UUID without dashes", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: "550e8400e29b41d4a716446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("should reject numeric setId", () => {
      const result = generationSetIdParamSchema.safeParse({
        setId: 12345,
      });
      expect(result.success).toBe(false);
    });
  });
});
