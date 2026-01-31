import { describe, it, expect } from "vitest";
import {
  cefrLevelSchema,
  uuidSchema,
  listSetsQuerySchema,
  wordCreateInputSchema,
  setCreateCommandSchema,
  setIdParamSchema,
  wordUpsertInputSchema,
  setUpdateCommandSchema,
  wordIdParamSchema,
  wordUpdateCommandSchema,
  wordsAddCommandSchema,
} from "@/lib/schemas/sets";

describe("Sets Schemas", () => {
  // ---------------------------------------------------------------------------
  // Common schemas
  // ---------------------------------------------------------------------------

  describe("cefrLevelSchema", () => {
    it("should validate all valid CEFR levels", () => {
      const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
      levels.forEach((level) => {
        const result = cefrLevelSchema.safeParse(level);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid CEFR levels", () => {
      const invalidLevels = ["A3", "D1", "B", "1", "a1", ""];
      invalidLevels.forEach((level) => {
        const result = cefrLevelSchema.safeParse(level);
        expect(result.success).toBe(false);
      });
    });

    it("should reject lowercase CEFR levels", () => {
      const result = cefrLevelSchema.safeParse("b1");
      expect(result.success).toBe(false);
    });
  });

  describe("uuidSchema", () => {
    it("should validate correct UUID", () => {
      const result = uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID format", () => {
      const result = uuidSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Must be a valid UUID");
      }
    });

    it("should reject empty string", () => {
      const result = uuidSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject UUID with wrong format", () => {
      const result = uuidSchema.safeParse("550e8400-e29b-41d4-a716");
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/sets - List sets
  // ---------------------------------------------------------------------------

  describe("listSetsQuerySchema", () => {
    it("should validate with default values", () => {
      const result = listSetsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.sort).toBe("created_at_desc");
      }
    });

    it("should validate with all parameters", () => {
      const result = listSetsQuerySchema.safeParse({
        search: "test",
        level: "B2",
        cursor: "2024-01-01T00:00:00Z|550e8400-e29b-41d4-a716-446655440000",
        limit: "25",
        sort: "name_asc",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe("test");
        expect(result.data.level).toBe("B2");
        expect(result.data.limit).toBe(25);
        expect(result.data.sort).toBe("name_asc");
      }
    });

    it("should coerce string limit to number", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "20" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should reject limit below 1", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "0" });
      expect(result.success).toBe(false);
    });

    it("should reject limit above 50", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "51" });
      expect(result.success).toBe(false);
    });

    it("should accept limit exactly 1", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "1" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it("should accept limit exactly 50", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "50" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should reject invalid CEFR level", () => {
      const result = listSetsQuerySchema.safeParse({ level: "X1" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid sort option", () => {
      const result = listSetsQuerySchema.safeParse({ sort: "invalid_sort" });
      expect(result.success).toBe(false);
    });

    it("should accept empty search string", () => {
      const result = listSetsQuerySchema.safeParse({ search: "" });
      expect(result.success).toBe(true);
    });

    it("should reject non-integer limit", () => {
      const result = listSetsQuerySchema.safeParse({ limit: "10.5" });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/sets - Create set
  // ---------------------------------------------------------------------------

  describe("wordCreateInputSchema", () => {
    it("should validate correct word", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "dom",
        en: "house",
      });
      expect(result.success).toBe(true);
    });

    it("should trim English word", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "dom",
        en: "  house  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.en).toBe("house");
      }
    });

    it("should reject English word with only whitespace", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "dom",
        en: "   ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("English word cannot be only whitespace");
      }
    });

    it("should reject empty Polish word", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "",
        en: "house",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Polish word is required");
      }
    });

    it("should reject empty English word", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "dom",
        en: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("English word is required");
      }
    });

    it("should reject Polish word exceeding 200 characters", () => {
      const longWord = "a".repeat(201);
      const result = wordCreateInputSchema.safeParse({
        pl: longWord,
        en: "test",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Polish word too long");
      }
    });

    it("should reject English word exceeding 200 characters", () => {
      const longWord = "a".repeat(201);
      const result = wordCreateInputSchema.safeParse({
        pl: "test",
        en: longWord,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("English word too long");
      }
    });

    it("should accept Polish word exactly 200 characters", () => {
      const word = "a".repeat(200);
      const result = wordCreateInputSchema.safeParse({
        pl: word,
        en: "test",
      });
      expect(result.success).toBe(true);
    });

    it("should accept English word exactly 200 characters", () => {
      const word = "a".repeat(200);
      const result = wordCreateInputSchema.safeParse({
        pl: "test",
        en: word,
      });
      expect(result.success).toBe(true);
    });

    it("should accept words with special characters", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "cześć! Jak się masz?",
        en: "hello! How are you?",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing Polish field", () => {
      const result = wordCreateInputSchema.safeParse({
        en: "house",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing English field", () => {
      const result = wordCreateInputSchema.safeParse({
        pl: "dom",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("setCreateCommandSchema", () => {
    it("should validate correct set creation data", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Basic Words",
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [
          { pl: "dom", en: "house" },
          { pl: "kot", en: "cat" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should validate with minimum 1 word", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Single Word Set",
        level: "B1",
        timezone: "America/New_York",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(true);
    });

    it("should validate with maximum 5 words", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Max Words Set",
        level: "C2",
        timezone: "Asia/Tokyo",
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
          { pl: "word3", en: "word3" },
          { pl: "word4", en: "word4" },
          { pl: "word5", en: "word5" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject set with 0 words", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Empty Set",
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("At least one word is required");
      }
    });

    it("should reject set with more than 5 words", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Too Many Words",
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
          { pl: "word3", en: "word3" },
          { pl: "word4", en: "word4" },
          { pl: "word5", en: "word5" },
          { pl: "word6", en: "word6" },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Maximum 5 words allowed per set");
      }
    });

    it("should trim set name", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "  Trimmed Name  ",
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed Name");
      }
    });

    it("should reject empty set name", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "",
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Set name is required");
      }
    });

    it("should reject set name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = setCreateCommandSchema.safeParse({
        name: longName,
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Set name too long");
      }
    });

    it("should accept set name exactly 100 characters", () => {
      const name = "a".repeat(100);
      const result = setCreateCommandSchema.safeParse({
        name: name,
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid CEFR level", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Test Set",
        level: "D1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty timezone", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Test Set",
        level: "A1",
        timezone: "",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Timezone is required");
      }
    });

    it("should reject missing name", () => {
      const result = setCreateCommandSchema.safeParse({
        level: "A1",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing level", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Test Set",
        timezone: "Europe/Warsaw",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing timezone", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Test Set",
        level: "A1",
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing words", () => {
      const result = setCreateCommandSchema.safeParse({
        name: "Test Set",
        level: "A1",
        timezone: "Europe/Warsaw",
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/sets/{setId} - Get single set
  // ---------------------------------------------------------------------------

  describe("setIdParamSchema", () => {
    it("should validate correct UUID", () => {
      const result = setIdParamSchema.safeParse({
        setId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = setIdParamSchema.safeParse({
        setId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing setId", () => {
      const result = setIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/sets/{setId} - Update set
  // ---------------------------------------------------------------------------

  describe("wordUpsertInputSchema", () => {
    it("should validate word without id (new word)", () => {
      const result = wordUpsertInputSchema.safeParse({
        pl: "nowy",
        en: "new",
      });
      expect(result.success).toBe(true);
    });

    it("should validate word with id (existing word)", () => {
      const result = wordUpsertInputSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        pl: "stary",
        en: "old",
      });
      expect(result.success).toBe(true);
    });

    it("should trim English word", () => {
      const result = wordUpsertInputSchema.safeParse({
        pl: "test",
        en: "  trimmed  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.en).toBe("trimmed");
      }
    });

    it("should reject English word with only whitespace", () => {
      const result = wordUpsertInputSchema.safeParse({
        pl: "test",
        en: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid UUID for id", () => {
      const result = wordUpsertInputSchema.safeParse({
        id: "not-a-uuid",
        pl: "test",
        en: "test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("setUpdateCommandSchema", () => {
    it("should validate update with only name", () => {
      const result = setUpdateCommandSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("should validate update with only level", () => {
      const result = setUpdateCommandSchema.safeParse({
        level: "B2",
      });
      expect(result.success).toBe(true);
    });

    it("should validate update with only words", () => {
      const result = setUpdateCommandSchema.safeParse({
        words: [{ pl: "test", en: "test" }],
      });
      expect(result.success).toBe(true);
    });

    it("should validate update with all fields", () => {
      const result = setUpdateCommandSchema.safeParse({
        name: "Updated Name",
        level: "C1",
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject update with no fields", () => {
      const result = setUpdateCommandSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("At least one field (name, level, or words) must be provided");
      }
    });

    it("should reject empty name", () => {
      const result = setUpdateCommandSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Set name cannot be empty");
      }
    });

    it("should reject name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = setUpdateCommandSchema.safeParse({
        name: longName,
      });
      expect(result.success).toBe(false);
    });

    it("should reject words array with 0 words", () => {
      const result = setUpdateCommandSchema.safeParse({
        words: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject words array with more than 5 words", () => {
      const result = setUpdateCommandSchema.safeParse({
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
          { pl: "word3", en: "word3" },
          { pl: "word4", en: "word4" },
          { pl: "word5", en: "word5" },
          { pl: "word6", en: "word6" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("should trim name", () => {
      const result = setUpdateCommandSchema.safeParse({
        name: "  Trimmed  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Trimmed");
      }
    });

    it("should accept name and level together", () => {
      const result = setUpdateCommandSchema.safeParse({
        name: "New Name",
        level: "A2",
      });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/sets/{setId}/words - Add words to set
  // ---------------------------------------------------------------------------

  describe("wordsAddCommandSchema", () => {
    it("should validate adding single word", () => {
      const result = wordsAddCommandSchema.safeParse({
        words: [{ pl: "nowy", en: "new" }],
      });
      expect(result.success).toBe(true);
    });

    it("should validate adding maximum 5 words", () => {
      const result = wordsAddCommandSchema.safeParse({
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
          { pl: "word3", en: "word3" },
          { pl: "word4", en: "word4" },
          { pl: "word5", en: "word5" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty words array", () => {
      const result = wordsAddCommandSchema.safeParse({
        words: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("At least one word is required");
      }
    });

    it("should reject more than 5 words", () => {
      const result = wordsAddCommandSchema.safeParse({
        words: [
          { pl: "word1", en: "word1" },
          { pl: "word2", en: "word2" },
          { pl: "word3", en: "word3" },
          { pl: "word4", en: "word4" },
          { pl: "word5", en: "word5" },
          { pl: "word6", en: "word6" },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Maximum 5 words allowed per request");
      }
    });

    it("should reject missing words field", () => {
      const result = wordsAddCommandSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/sets/{setId}/words/{wordId} - Update word
  // ---------------------------------------------------------------------------

  describe("wordIdParamSchema", () => {
    it("should validate correct UUID", () => {
      const result = wordIdParamSchema.safeParse({
        wordId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = wordIdParamSchema.safeParse({
        wordId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing wordId", () => {
      const result = wordIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("wordUpdateCommandSchema", () => {
    it("should validate update with only Polish word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        pl: "zaktualizowany",
      });
      expect(result.success).toBe(true);
    });

    it("should validate update with only English word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        en: "updated",
      });
      expect(result.success).toBe(true);
    });

    it("should validate update with both fields", () => {
      const result = wordUpdateCommandSchema.safeParse({
        pl: "zaktualizowany",
        en: "updated",
      });
      expect(result.success).toBe(true);
    });

    it("should reject update with no fields", () => {
      const result = wordUpdateCommandSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("At least one field (pl or en) must be provided");
      }
    });

    it("should reject empty Polish word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        pl: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Polish word cannot be empty");
      }
    });

    it("should reject empty English word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        en: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("English word cannot be empty");
      }
    });

    it("should trim Polish word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        pl: "  trimmed  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pl).toBe("trimmed");
      }
    });

    it("should trim English word", () => {
      const result = wordUpdateCommandSchema.safeParse({
        en: "  trimmed  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.en).toBe("trimmed");
      }
    });

    it("should reject Polish word exceeding 200 characters", () => {
      const longWord = "a".repeat(201);
      const result = wordUpdateCommandSchema.safeParse({
        pl: longWord,
      });
      expect(result.success).toBe(false);
    });

    it("should reject English word exceeding 200 characters", () => {
      const longWord = "a".repeat(201);
      const result = wordUpdateCommandSchema.safeParse({
        en: longWord,
      });
      expect(result.success).toBe(false);
    });

    it("should accept Polish word exactly 200 characters", () => {
      const word = "a".repeat(200);
      const result = wordUpdateCommandSchema.safeParse({
        pl: word,
      });
      expect(result.success).toBe(true);
    });

    it("should accept English word exactly 200 characters", () => {
      const word = "a".repeat(200);
      const result = wordUpdateCommandSchema.safeParse({
        en: word,
      });
      expect(result.success).toBe(true);
    });
  });
});
