import type { SupabaseClient } from "../../../db/supabase.client";
import type { WordUpdateCommand, WordUpdateResponseDTO } from "../../../types";

/**
 * Service function to update an existing word's translations.
 *
 * Implements:
 * - Word existence and ownership verification (via set)
 * - Partial update support (pl and/or en)
 * - Duplicate English word detection (en_norm constraint)
 * - Returns updated word data
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - UUID of the set containing the word
 * @param wordId - UUID of the word to update
 * @param command - Fields to update (pl and/or en)
 * @returns Updated word or null if not found
 * @throws Error with specific code for proper error mapping
 */
export async function updateWord(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  wordId: string,
  command: WordUpdateCommand
): Promise<WordUpdateResponseDTO | null> {
  // Step 1: Verify word exists and belongs to user's set
  const { data: wordData, error: wordError } = await supabase
    .from("words")
    .select("id, set_id, user_id")
    .eq("id", wordId)
    .eq("set_id", setId)
    .eq("user_id", userId)
    .single();

  if (wordError || !wordData) {
    return null;
  }

  // Step 2: Prepare update data
  const updateData: { pl?: string; en?: string } = {};
  if (command.pl !== undefined) {
    updateData.pl = command.pl.trim();
  }
  if (command.en !== undefined) {
    updateData.en = command.en.trim();
  }

  // Step 3: Update the word
  const { data: updatedWord, error: updateError } = await supabase
    .from("words")
    .update(updateData)
    .eq("id", wordId)
    .select("id, pl, en")
    .single();

  if (updateError) {
    // Check for duplicate en_norm constraint violation
    if (updateError.code === "23505" && updateError.message.includes("words_user_id_set_id_en_norm_key")) {
      const error = new Error("English word already exists in this set");
      (error as any).code = "WORD_DUPLICATE";
      throw error;
    }

    console.error("Error updating word:", updateError);
    throw new Error("Failed to update word");
  }

  if (!updatedWord) {
    return null;
  }

  // Step 4: Optional - Log event to event_log
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_type: "word_updated",
      entity_id: wordId,
    });
  } catch (logError) {
    console.error("Error logging event:", logError);
    // Ignore logging errors
  }

  // Step 5: Return updated word
  return {
    id: updatedWord.id,
    pl: updatedWord.pl,
    en: updatedWord.en,
  };
}
