import type { SupabaseClient } from '../../../db/supabase.client';
import type { SessionFinishCommand, SessionFinishResponseDTO } from '../../../types';

/**
 * Service function to finish an active exercise session.
 * 
 * Implements:
 * - Verifies session ownership
 * - Ensures session is not already finished
 * - Updates finished_at timestamp
 * - Optional event logging
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param sessionId - UUID of the session to finish
 * @param command - Finish command with completion reason
 * @returns Confirmation with finished_at timestamp
 * @throws Error with specific code for proper error mapping
 */
export async function finishSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  command: SessionFinishCommand
): Promise<SessionFinishResponseDTO> {
  const { completed_reason } = command;

  // Step 1: Fetch session and verify ownership and status
  const { data: sessionData, error: sessionError } = await supabase
    .from('exercise_sessions')
    .select('id, finished_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (sessionError || !sessionData) {
    const error = new Error('Session not found or access denied');
    (error as any).code = 'SESSION_NOT_FOUND';
    throw error;
  }

  // Step 2: Check if session is already finished
  if (sessionData.finished_at !== null) {
    const error = new Error('Session is already finished');
    (error as any).code = 'ALREADY_FINISHED';
    throw error;
  }

  // Step 3: Update session to mark as finished
  const now = new Date().toISOString();
  
  const { data: updatedSession, error: updateError } = await supabase
    .from('exercise_sessions')
    .update({ finished_at: now })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('finished_at')
    .single();

  if (updateError || !updatedSession) {
    console.error('Error finishing session:', updateError);
    throw new Error('Failed to finish session');
  }

  // Step 4: Optional - Log event to event_log
  // Store completed_reason in metadata if event_log supports it
  try {
    await supabase.from('event_log').insert({
      user_id: userId,
      event_type: 'session_finished',
      entity_id: sessionId,
      // Note: If event_log has metadata column, we could store:
      // metadata: { completed_reason }
    });
  } catch (logError) {
    console.error('Error logging event:', logError);
    // Ignore logging errors
  }

  // Return success response
  return {
    message: 'SESSION_FINISHED',
    finished_at: updatedSession.finished_at,
  };
}

