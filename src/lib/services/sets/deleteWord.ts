import type { SupabaseClient } from "../../../db/supabase.client";
import type { WordDeleteResponseDTO } from "../../../types";

/**
 * Service function to delete a word from a set.
 *
 * Implements:
 * - Word existence and ownership verification (via set)
 * - Word deletion with cascade to related data
 * - Automatic words_count decrement
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - UUID of the set containing the word
 * @param wordId - UUID of the word to delete
 * @returns Success response with updated count or error info
 */
export async function deleteWord(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  wordId: string
): Promise<{ success: true; data: WordDeleteResponseDTO } | { success: false; error: "NOT_FOUND" }> {
  // Step 1: Verify word exists and belongs to user's set
  const { data: wordData, error: wordError } = await supabase
    .from("words")
    .select("id, set_id, user_id")
    .eq("id", wordId)
    .eq("set_id", setId)
    .eq("user_id", userId)
    .single();

  if (wordError || !wordData) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Step 2: Get current words_count before deletion
  const { data: setData, error: setError } = await supabase.from("sets").select("words_count").eq("id", setId).single();

  if (setError || !setData) {
    return { success: false, error: "NOT_FOUND" };
  }

  // Step 3: Delete the word (cascade will handle related data)
  const { error: deleteError } = await supabase.from("words").delete().eq("id", wordId);

  if (deleteError) {
    console.error("Error deleting word:", deleteError);
    throw new Error("Failed to delete word");
  }

  // Step 4: Update words_count on the set
  const newWordsCount = Math.max(0, setData.words_count - 1);

  const { error: updateError } = await supabase.from("sets").update({ words_count: newWordsCount }).eq("id", setId);

  if (updateError) {
    console.error("Error updating words_count:", updateError);
    // Non-critical error - continue with response
  }

  // Step 5: Optional - Log event to event_log
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_type: "word_deleted",
      entity_id: wordId,
    });
  } catch (logError) {
    console.error("Error logging event:", logError);
    // Ignore logging errors
  }

  // Step 6: Return success response
  return {
    success: true,
    data: {
      message: "WORD_DELETED",
      words_count: newWordsCount,
    },
  };
}
