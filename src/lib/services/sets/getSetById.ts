import type { SupabaseClient } from '../../../db/supabase.client';
import type { SetDetailDTO, WordDTO } from '../../../types';

/**
 * Service function to retrieve a single set with all its details.
 * 
 * Implements:
 * - Fetch set metadata with user_id authorization
 * - Fetch all words ordered by position
 * - Fetch latest generation run metadata (if exists)
 * - Return complete SetDetailDTO or null if not found
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - Set UUID to retrieve
 * @returns SetDetailDTO with words and latest generation, or null if not found
 */
export async function getSetById(
  supabase: SupabaseClient,
  userId: string,
  setId: string
): Promise<SetDetailDTO | null> {
  // Step 1: Fetch the set record
  const { data: setData, error: setError } = await supabase
    .from('sets')
    .select('id, name, level, words_count, created_at, updated_at, user_id')
    .eq('id', setId)
    .eq('user_id', userId)
    .single();

  if (setError || !setData) {
    // Set not found or doesn't belong to user
    return null;
  }

  // Step 2: Fetch all words for this set, ordered by position
  const { data: wordsData, error: wordsError } = await supabase
    .from('words')
    .select('id, pl, en, position')
    .eq('set_id', setId)
    .order('position', { ascending: true });

  if (wordsError) {
    console.error('Error fetching words:', wordsError);
    throw new Error('Failed to fetch words for set');
  }

  const words: WordDTO[] = wordsData || [];

  // Step 3: Fetch the latest generation run for this set
  const { data: generationData, error: generationError } = await supabase
    .from('generation_runs')
    .select('id, occurred_at')
    .eq('set_id', setId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() to allow null result

  if (generationError) {
    console.error('Error fetching latest generation:', generationError);
    // Non-critical error, we can continue without generation data
  }

  // Step 4: Compose the SetDetailDTO
  const setDetail: SetDetailDTO = {
    id: setData.id,
    name: setData.name,
    level: setData.level,
    words_count: setData.words_count,
    created_at: setData.created_at,
    updated_at: setData.updated_at,
    user_id: setData.user_id,
    words,
    latest_generation: generationData || null,
  };

  return setDetail;
}

