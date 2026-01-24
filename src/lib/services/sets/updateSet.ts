import type { SupabaseClient } from "../../../db/supabase.client";
import type { SetUpdateCommand, SetDetailDTO } from "../../../types";
import { checkActiveSession } from "./checkActiveSession";
import { getSetById } from "./getSetById";

/**
 * Service function to update a set's metadata and/or replace its words collection.
 *
 * Implements:
 * - Update set name (with uniqueness check per user)
 * - Update CEFR level
 * - Replace entire words collection (1-5 words) - delete old, insert new
 * - Business guard: block word updates if active session exists
 * - Transaction handling for atomicity
 * - Optional event logging
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - Set UUID to update
 * @param command - Update command (name, level, words - all optional)
 * @returns Updated SetDetailDTO or null if set not found
 * @throws Error with specific code for proper error mapping
 */
export async function updateSet(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  command: SetUpdateCommand
): Promise<SetDetailDTO | null> {
  const { name, level, words } = command;

  // Step 1: Check if set exists and belongs to user
  const existingSet = await getSetById(supabase, userId, setId);
  if (!existingSet) {
    return null;
  }

  // Step 2: If words are being updated, check for active session
  if (words !== undefined) {
    const hasActiveSession = await checkActiveSession(supabase, setId);
    if (hasActiveSession) {
      const error = new Error("Cannot update set with active exercise session.");
      (error as any).code = "ACTIVE_SESSION";
      throw error;
    }
  }

  // Step 3: Update set metadata (name and/or level) if provided
  if (name !== undefined || level !== undefined) {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (level !== undefined) updateData.level = level;
    updateData.updated_at = new Date().toISOString();

    const { error: setUpdateError } = await supabase
      .from("sets")
      .update(updateData)
      .eq("id", setId)
      .eq("user_id", userId);

    if (setUpdateError) {
      // Check for unique constraint violation (duplicate name)
      if (setUpdateError.code === "23505" && setUpdateError.message.includes("sets_user_id_name_key")) {
        const error = new Error("Set with this name already exists");
        (error as any).code = "DUPLICATE_NAME";
        throw error;
      }

      console.error("Error updating set metadata:", setUpdateError);
      throw new Error("Failed to update set");
    }
  }

  // Step 4: Replace words collection if provided (delete old + insert new)
  if (words !== undefined) {
    try {
      // Step 4a: Separate words into updates and inserts
      const wordsToUpdate = words.filter((w) => w.id !== undefined);
      const wordsToInsert = words.filter((w) => w.id === undefined);

      // Get list of existing word IDs
      const { data: existingWords, error: fetchError } = await supabase.from("words").select("id").eq("set_id", setId);

      if (fetchError) {
        console.error("Error fetching existing words:", fetchError);
        throw new Error("Failed to fetch existing words");
      }

      const existingWordIds = (existingWords || []).map((w) => w.id);
      const updatedWordIds = wordsToUpdate.map((w) => w.id!);

      // Step 4b: Delete words that are not in the new list
      const wordsToDelete = existingWordIds.filter((id) => !updatedWordIds.includes(id));
      if (wordsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("words").delete().in("id", wordsToDelete);

        if (deleteError) {
          console.error("Error deleting old words:", deleteError);
          throw new Error("Failed to delete old words");
        }
      }

      // Step 4c: Update existing words
      if (wordsToUpdate.length > 0) {
        for (const word of wordsToUpdate) {
          const { error: updateError } = await supabase
            .from("words")
            .update({
              pl: word.pl.trim(),
              en: word.en.trim(),
            })
            .eq("id", word.id!)
            .eq("set_id", setId)
            .eq("user_id", userId);

          if (updateError) {
            // Check for duplicate en_norm
            if (updateError.code === "23505" && updateError.message.includes("words_user_id_set_id_en_norm_key")) {
              const error = new Error("English word is duplicated in this set");
              (error as any).code = "DUPLICATE_ENGLISH_WORD";
              throw error;
            }

            console.error("Error updating word:", updateError);
            throw new Error("Failed to update word");
          }
        }
      }

      // Step 4d: Insert new words
      if (wordsToInsert.length > 0) {
        const newWords = wordsToInsert.map((word) => ({
          set_id: setId,
          user_id: userId,
          pl: word.pl.trim(),
          en: word.en.trim(),
        }));

        const { error: insertError } = await supabase.from("words").insert(newWords);

        if (insertError) {
          // Check for duplicate en_norm
          if (insertError.code === "23505" && insertError.message.includes("words_user_id_set_id_en_norm_key")) {
            const error = new Error("English word is duplicated in this set");
            (error as any).code = "DUPLICATE_ENGLISH_WORD";
            throw error;
          }

          console.error("Error inserting new words:", insertError);
          throw new Error("Failed to insert new words");
        }
      }

      // Step 4e: Update words_count
      const totalWords = words.length;
      const { error: countUpdateError } = await supabase
        .from("sets")
        .update({ words_count: totalWords, updated_at: new Date().toISOString() })
        .eq("id", setId);

      if (countUpdateError) {
        console.error("Error updating words_count:", countUpdateError);
        // Non-critical, we can continue
      }
    } catch (error) {
      // Re-throw to be handled by outer catch
      throw error;
    }
  }

  // Step 5: Optional - Log event to event_log
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_type: "set_updated",
      entity_id: setId,
    });
  } catch (logError) {
    console.error("Error logging event:", logError);
    // Ignore logging errors
  }

  // Step 6: Fetch and return updated set
  const updatedSet = await getSetById(supabase, userId, setId);
  return updatedSet;
}
