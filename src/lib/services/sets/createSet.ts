import type { SupabaseClient } from "../../../db/supabase.client";
import type { SetCreateCommand, SetSummaryDTO } from "../../../types";

/**
 * Service function to create a new set with initial words (1-5).
 *
 * Implements:
 * - Set creation with name uniqueness enforcement (per user)
 * - Initial words insertion (1-5 words)
 * - English word normalization (en_norm) for duplicate detection
 * - Transaction handling for atomicity
 * - Optional event logging
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param command - Set creation command (name, level, timezone, words)
 * @returns Created set summary or null on error
 * @throws Error with specific code for proper error mapping
 */
export async function createSet(
  supabase: SupabaseClient,
  userId: string,
  command: SetCreateCommand
): Promise<SetSummaryDTO> {
  const { name, level, words } = command;

  // Step 1: Insert the set record
  const { data: setData, error: setError } = await supabase
    .from("sets")
    .insert({
      user_id: userId,
      name: name.trim(),
      level,
      words_count: 0, // Will be updated after words insertion
    })
    .select("id, name, level, words_count, created_at")
    .single();

  if (setError) {
    // Check for unique constraint violation (duplicate name)
    if (setError.code === "23505" && setError.message.includes("sets_user_id_name_key")) {
      const error = new Error("Set with this name already exists");
      (error as any).code = "DUPLICATE_NAME";
      throw error;
    }

    console.error("Error creating set:", setError);
    throw new Error("Failed to create set");
  }

  const setId = setData.id;

  try {
    // Step 2: Prepare words for insertion (position removed, order defined by created_at)
    const wordsToInsert = words.map((word) => ({
      set_id: setId,
      user_id: userId,
      pl: word.pl.trim(),
      en: word.en.trim(),
    }));

    // Step 3: Insert words
    const { data: wordsData, error: wordsError } = await supabase.from("words").insert(wordsToInsert).select("id");

    if (wordsError) {
      // Check for duplicate en_norm constraint violation
      if (wordsError.code === "23505" && wordsError.message.includes("words_user_id_set_id_en_norm_key")) {
        // Try to extract the duplicate word from error message
        const error = new Error("English word is duplicated in this set");
        (error as any).code = "DUPLICATE_ENGLISH_WORD";
        throw error;
      }

      console.error("Error inserting words:", wordsError);
      throw new Error("Failed to insert words");
    }

    const insertedCount = wordsData?.length ?? 0;

    // Step 4: Update words_count on the set
    const { error: updateError } = await supabase.from("sets").update({ words_count: insertedCount }).eq("id", setId);

    if (updateError) {
      console.error("Error updating words_count:", updateError);
      // This is non-critical, we can continue
    }

    // Step 5: Optional - Log event to event_log
    // This can be done asynchronously and failures should not block the response
    try {
      await supabase.from("event_log").insert({
        user_id: userId,
        event_type: "set_created",
        entity_id: setId,
      });
    } catch (logError) {
      console.error("Error logging event:", logError);
      // Ignore logging errors
    }

    // Return the created set summary
    return {
      id: setData.id,
      name: setData.name,
      level: setData.level,
      words_count: insertedCount,
      created_at: setData.created_at,
    };
  } catch (error) {
    // If words insertion failed, clean up the set
    // This is a best-effort cleanup - if it fails, the set will remain orphaned
    try {
      await supabase.from("sets").delete().eq("id", setId);
    } catch (cleanupError) {
      console.error("Error cleaning up set after words insertion failure:", cleanupError);
    }

    // Re-throw the original error
    throw error;
  }
}
