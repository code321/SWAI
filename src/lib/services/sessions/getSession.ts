import type { SupabaseClient } from '../../../db/supabase.client';
import type { SessionDetailDTO } from '../../../types';

/**
 * Service function to get exercise session details with progress and sentences.
 * 
 * Implements:
 * - Fetches session record with ownership check
 * - Calculates progress (attempted, correct, remaining)
 * - Fetches all sentences for the session with latest attempt info
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param sessionId - UUID of the session to fetch
 * @returns Session details with progress and sentences
 * @throws Error with specific code for proper error mapping
 */
export async function getSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<SessionDetailDTO> {
  // Step 1: Fetch session record and verify ownership
  const { data: sessionData, error: sessionError } = await supabase
    .from('exercise_sessions')
    .select('id, set_id, generation_id, started_at, finished_at')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (sessionError || !sessionData) {
    const error = new Error('Session not found or access denied');
    (error as any).code = 'SESSION_NOT_FOUND';
    throw error;
  }

  // Step 2: Fetch all sentences for this generation
  const { data: sentencesData, error: sentencesError } = await supabase
    .from('sentences')
    .select('id, pl_text')
    .eq('generation_id', sessionData.generation_id)
    .eq('user_id', userId)
    .order('id', { ascending: true });

  if (sentencesError) {
    console.error('Error fetching sentences:', sentencesError);
    throw new Error('Failed to fetch sentences');
  }

  const sentences = sentencesData ?? [];

  // Step 3: Fetch all attempts for this session to calculate progress
  const { data: attemptsData, error: attemptsError } = await supabase
    .from('attempts')
    .select('sentence_id, attempt_no, is_correct, checked_at')
    .eq('session_id', sessionId)
    .order('sentence_id', { ascending: true })
    .order('attempt_no', { ascending: false }); // Latest attempt first per sentence

  if (attemptsError) {
    console.error('Error fetching attempts:', attemptsError);
    throw new Error('Failed to fetch attempts');
  }

  const attempts = attemptsData ?? [];

  // Step 4: Build map of latest attempt per sentence
  const latestAttemptMap = new Map<string, { attempt_no: number; is_correct: boolean }>();
  
  for (const attempt of attempts) {
    if (!latestAttemptMap.has(attempt.sentence_id)) {
      latestAttemptMap.set(attempt.sentence_id, {
        attempt_no: attempt.attempt_no,
        is_correct: attempt.is_correct,
      });
    }
  }

  // Step 5: Calculate progress
  const attemptedSentences = latestAttemptMap.size;
  const correctSentences = Array.from(latestAttemptMap.values()).filter(
    (a) => a.is_correct
  ).length;
  const remainingSentences = sentences.length - attemptedSentences;

  // Step 6: Build session sentences with latest attempt info
  const sessionSentences = sentences.map((sentence) => {
    const latestAttempt = latestAttemptMap.get(sentence.id);
    
    return {
      sentence_id: sentence.id,
      pl_text: sentence.pl_text,
      latest_attempt: latestAttempt
        ? {
            attempt_no: latestAttempt.attempt_no,
            is_correct: latestAttempt.is_correct,
          }
        : undefined,
    };
  });

  // Return the session detail DTO
  return {
    id: sessionData.id,
    set_id: sessionData.set_id,
    generation_id: sessionData.generation_id,
    started_at: sessionData.started_at,
    finished_at: sessionData.finished_at,
    progress: {
      attempted: attemptedSentences,
      correct: correctSentences,
      remaining: remainingSentences,
    },
    sentences: sessionSentences,
  };
}




