import type { SupabaseClient } from "../../../db/supabase.client";
import type { SetGenerationCommand, GenerationResponseDTO } from "../../../types";
import type { Json } from "../../../db/database.types";
import { OpenRouterService } from "../openrouter";
import { OpenRouterError } from "../openrouter/errors";

/**
 * Daily limit for generation runs per user.
 */
const DAILY_GENERATION_LIMIT = 10;

/**
 * Custom error with code property
 */
class CodedError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "CodedError";
  }
}

/**
 * Service function to trigger sentence generation for a set.
 *
 * Implements:
 * - Set ownership verification
 * - Daily generation limit enforcement (≤10 per user)
 * - Idempotency key checking (unique per user + day)
 * - Set words validation (must have at least 1 word)
 * - LLM sentence generation via OpenRouter
 * - Generation run creation with words snapshot
 * - Event logging
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - UUID of the set to generate sentences for
 * @param command - Generation parameters (model_id, temperature, prompt_version)
 * @param idempotencyKey - Unique key for idempotent requests
 * @param openRouterApiKey - OpenRouter API key for LLM calls
 * @returns Generation response with sentences and usage stats
 * @throws Error with specific code for proper error mapping
 */
export async function triggerGeneration(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  command: SetGenerationCommand,
  idempotencyKey: string,
  openRouterApiKey: string
): Promise<GenerationResponseDTO> {
  console.log("triggerGeneration called");
  console.log("userId", userId);
  console.log("setId", setId);
  console.log("command", command);
  console.log("idempotencyKey", idempotencyKey);
  console.log("openRouterApiKey", openRouterApiKey);

  // Step 1: Verify set exists and user owns it
  const { data: setData, error: setError } = await supabase
    .from("sets")
    .select("id, name, user_id, words_count")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  console.log("setData", setData);

  if (setError || !setData) {
    console.log("Set not found or access denied");
    throw new CodedError("Set not found or access denied", "SET_NOT_FOUND");
  }

  // Step 2: Check if set has words
  if (setData.words_count === 0) {
    throw new CodedError("Set has no words to generate sentences for", "SET_HAS_NO_WORDS");
  }

  // Step 3: Check daily generation limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: generationsToday, error: countError } = await supabase
    .from("generation_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("occurred_at", startOfDay.toISOString());

  if (countError) {
    // eslint-disable-next-line no-console
    console.error("Error checking daily limit:", countError);
    throw new Error("Failed to check daily generation limit");
  }

  if ((generationsToday ?? 0) >= DAILY_GENERATION_LIMIT) {
    throw new CodedError("Daily generation limit reached", "DAILY_LIMIT_REACHED");
  }

  console.log("generationsToday", generationsToday);

  // Step 4: Check idempotency - if this key was already used, return existing result
  const { data: existingRun, error: idempotencyError } = await supabase
    .from("generation_runs")
    .select(
      `
      id,
      set_id,
      occurred_at,
      tokens_in,
      tokens_out,
      cost_usd,
      sentences (
        id,
        word_id,
        pl_text,
        target_en
      )
    `
    )
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  console.log("existingRun", existingRun);

  if (idempotencyError) {
    // eslint-disable-next-line no-console
    console.error("Error checking idempotency:", idempotencyError);
    throw new Error("Failed to check idempotency key");
  }

  if (existingRun) {
    // Return existing generation result
    const remainingGenerations = DAILY_GENERATION_LIMIT - ((generationsToday ?? 0) + 1);

    interface SentenceRecord {
      id: string;
      word_id: string;
      pl_text: string;
      target_en: string;
    }

    console.log("existingRun existingRun", existingRun);

    return {
      generation_id: existingRun.id,
      set_id: existingRun.set_id,
      occurred_at: existingRun.occurred_at,
      sentences: (existingRun.sentences as unknown as SentenceRecord[]).map((s) => ({
        user_id: userId,
        sentence_id: s.id,
        word_id: s.word_id,
        pl_text: s.pl_text,
        target_en: s.target_en,
      })),
      usage: {
        tokens_in: existingRun.tokens_in,
        tokens_out: existingRun.tokens_out,
        cost_usd: existingRun.cost_usd,
        remaining_generations_today: remainingGenerations,
      },
    };
  }

  // Step 5: Fetch words for the set to create snapshot
  const { data: words, error: wordsError } = await supabase
    .from("words")
    .select("id, pl, en")
    .eq("set_id", setId)
    .order("created_at", { ascending: true });

  if (wordsError || !words || words.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Error fetching words:", wordsError);
    throw new Error("Failed to fetch words for generation");
  }

  // Step 6: Create words snapshot (format: {pl, en})
  const wordsSnapshot = words.map((w) => ({
    pl: w.pl,
    en: w.en,
  }));

  // Step 7: Create generation_run record
  // Note: We create the record first with placeholder values, then update after LLM call
  const { data: generationRun, error: runError } = await supabase
    .from("generation_runs")
    .insert({
      user_id: userId,
      set_id: setId,
      model_id: command.model_id,
      temperature: command.temperature,
      prompt_version: command.prompt_version,
      idempotency_key: idempotencyKey,
      words_snapshot: wordsSnapshot as unknown as Json,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
    })
    .select("id, set_id, occurred_at")
    .single();

  if (runError) {
    // Check for duplicate idempotency key (race condition)
    if (runError.code === "23505" && runError.message.includes("generation_runs_user_id_idempotency_key_key")) {
      throw new CodedError("Duplicate idempotency key", "DUPLICATE_IDEMPOTENCY_KEY");
    }

    // eslint-disable-next-line no-console
    console.error("Error creating generation run:", runError);
    throw new Error("Failed to create generation run");
  }

  // Step 8: Call OpenRouter LLM to generate sentences
  console.log("Call OpenRouter LLM to generate sentences");
  let llmResponse;
  try {
    const openRouterService = new OpenRouterService({
      apiKey: openRouterApiKey,
    });

    llmResponse = await openRouterService.generateSentences({
      words: wordsSnapshot,
      modelId: command.model_id,
      temperature: command.temperature ?? 0.7,
      promptVersion: command.prompt_version,
    });

    console.log("llmResponse", llmResponse);
  } catch (error) {
    // Provide helpful error message based on error type
    if (error instanceof OpenRouterError) {
      throw new CodedError(`LLM generation failed: ${error.message}`, error.code);
    }

    throw new Error("Failed to generate sentences using LLM");
  }

  console.log("llmResponse", llmResponse);
  // Step 9: Update generation_run with actual usage stats
  const { error: updateError } = await supabase
    .from("generation_runs")
    .update({
      tokens_in: llmResponse.usage.tokens_in,
      tokens_out: llmResponse.usage.tokens_out,
      cost_usd: llmResponse.usage.cost_usd,
    })
    .eq("id", generationRun.id);

  if (updateError) {
    // eslint-disable-next-line no-console
    console.error("Error updating generation run with usage stats:", updateError);
    // Continue anyway - the sentences were generated
  }

  // Step 10: Map LLM sentences to words and insert into database
  const sentencesToInsert = llmResponse.sentences.map((sentence) => {
    // Find matching word by English text
    const matchingWord = words.find((w) => w.en.toLowerCase() === sentence.target_en.toLowerCase());

    if (!matchingWord) {
      // eslint-disable-next-line no-console
      console.warn(`No matching word found for target_en: ${sentence.target_en}`);
    }

    return {
      generation_id: generationRun.id,
      user_id: userId,
      word_id: matchingWord?.id || words[0].id, // Fallback to first word if no match
      pl_text: sentence.pl_text,
      target_en: sentence.target_en,
    };
  });

  const { data: sentences, error: sentencesError } = await supabase
    .from("sentences")
    .insert(sentencesToInsert)
    .select("id, word_id, pl_text, target_en");

  if (sentencesError) {
    // eslint-disable-next-line no-console
    console.error("Error inserting sentences:", sentencesError);
    throw new Error("Failed to insert generated sentences");
  }

  // Step 11: Log event to event_log
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_type: "generation_run_created",
      entity_id: generationRun.id,
    });
  } catch (logError) {
    // eslint-disable-next-line no-console
    console.error("Error logging event:", logError);
    // Ignore logging errors
  }

  // Step 12: Calculate remaining generations
  const remainingGenerations = DAILY_GENERATION_LIMIT - ((generationsToday ?? 0) + 1);

  // Step 13: Return response with actual usage data
  return {
    generation_id: generationRun.id,
    set_id: generationRun.set_id,
    occurred_at: generationRun.occurred_at,
    sentences: sentences.map((s) => ({
      user_id: userId,
      sentence_id: s.id,
      word_id: s.word_id,
      pl_text: s.pl_text,
      target_en: s.target_en,
    })),
    usage: {
      tokens_in: llmResponse.usage.tokens_in,
      tokens_out: llmResponse.usage.tokens_out,
      cost_usd: llmResponse.usage.cost_usd,
      remaining_generations_today: remainingGenerations,
    },
  };
}
