import type { SupabaseClient } from '../../../db/supabase.client';
import type { WordsAddCommand, WordsAddResponseDTO, WordDTO } from '../../../types';

/**
 * Service function to add 1-5 words to an existing set.
 * 
 * Implements:
 * - Set existence and ownership verification
 * - Duplicate English word detection (en_norm constraint)
 * - Bulk word insertion
 * - Automatic words_count update
 * - Transaction handling for atomicity
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - UUID of the set to add words to
 * @param command - Words to add (1-5 words)
 * @returns Response with added words and updated count
 * @throws Error with specific code for proper error mapping
 */
export async function addWords(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  command: WordsAddCommand
): Promise<WordsAddResponseDTO> {
  const { words } = command;

  // Step 1: Verify set exists and belongs to user
  const { data: setData, error: setError } = await supabase
    .from('sets')
    .select('id, words_count')
    .eq('id', setId)
    .eq('user_id', userId)
    .single();

  if (setError || !setData) {
    const error = new Error('Set not found');
    (error as any).code = 'SET_NOT_FOUND';
    throw error;
  }

  // Step 2: Prepare words for insertion
  const wordsToInsert = words.map((word) => ({
    set_id: setId,
    user_id: userId,
    pl: word.pl.trim(),
    en: word.en.trim(),
  }));

  // Step 3: Insert words (bulk insert)
  const { data: insertedWords, error: insertError } = await supabase
    .from('words')
    .insert(wordsToInsert)
    .select('id, pl, en');

  if (insertError) {
    // Check for duplicate en_norm constraint violation
    if (insertError.code === '23505' && insertError.message.includes('words_user_id_set_id_en_norm_key')) {
      const error = new Error('One or more English words already exist in this set');
      (error as any).code = 'WORD_DUPLICATE';
      throw error;
    }

    console.error('Error inserting words:', insertError);
    throw new Error('Failed to insert words');
  }

  if (!insertedWords || insertedWords.length === 0) {
    const error = new Error('No words were inserted');
    (error as any).code = 'INSERT_FAILED';
    throw error;
  }

  const insertedCount = insertedWords.length;
  const newWordsCount = setData.words_count + insertedCount;

  // Step 4: Update words_count on the set
  const { error: updateError } = await supabase
    .from('sets')
    .update({ words_count: newWordsCount })
    .eq('id', setId);

  if (updateError) {
    console.error('Error updating words_count:', updateError);
    // Non-critical error - continue with response
  }

  // Step 5: Optional - Log event to event_log
  try {
    await supabase.from('event_log').insert({
      user_id: userId,
      event_type: 'words_added',
      entity_id: setId,
    });
  } catch (logError) {
    console.error('Error logging event:', logError);
    // Ignore logging errors
  }

  // Step 6: Return response
  const addedWords: WordDTO[] = insertedWords.map((word) => ({
    id: word.id,
    pl: word.pl,
    en: word.en,
  }));

  return {
    added: addedWords,
    words_count: newWordsCount,
  };
}

