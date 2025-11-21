import type { SupabaseClient } from '../../../db/supabase.client';
import { checkActiveSession } from './checkActiveSession';

/**
 * Result type for deleteSet operation
 */
export type DeleteSetResult =
  | { success: true }
  | { success: false; error: 'NOT_FOUND' | 'ACTIVE_SESSION' };

/**
 * Service function to permanently delete a set and all related data.
 * 
 * Implements:
 * - Check set existence and user ownership
 * - Business guard: block deletion if active session exists
 * - Delete set (cascades to words, generations, sessions, attempts, ratings)
 * - Optional event logging before deletion
 * 
 * Note: Cascading deletes are handled automatically by Postgres ON DELETE CASCADE
 * constraints, so we don't need to manually delete related records.
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - Set UUID to delete
 * @returns Success result or error code
 */
export async function deleteSet(
  supabase: SupabaseClient,
  userId: string,
  setId: string
): Promise<DeleteSetResult> {
  // Step 1: Check if set exists and belongs to user
  const { data: setData, error: fetchError } = await supabase
    .from('sets')
    .select('id')
    .eq('id', setId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error checking set existence:', fetchError);
    return { success: false, error: 'NOT_FOUND' };
  }

  if (!setData) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // Step 2: Check for active exercise session
  const hasActiveSession = await checkActiveSession(supabase, setId);
  if (hasActiveSession) {
    return { success: false, error: 'ACTIVE_SESSION' };
  }

  // Step 3: Optional - Log event before deletion (to preserve entity_id)
  try {
    await supabase.from('event_log').insert({
      user_id: userId,
      event_type: 'set_deleted',
      entity_id: setId,
    });
  } catch (logError) {
    console.error('Error logging deletion event:', logError);
    // Non-critical, continue with deletion
  }

  // Step 4: Delete the set
  // Cascading deletes will automatically remove:
  // - words
  // - generation_runs
  // - sentences
  // - exercise_sessions
  // - attempts
  // - ratings
  const { error: deleteError } = await supabase
    .from('sets')
    .delete()
    .eq('id', setId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting set:', deleteError);
    throw new Error('Failed to delete set');
  }

  return { success: true };
}

