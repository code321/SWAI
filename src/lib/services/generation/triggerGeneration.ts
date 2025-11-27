import type { SupabaseClient } from '../../../db/supabase.client';
import type { 
  SetGenerationCommand, 
  GenerationResponseDTO,
  WordDTO 
} from '../../../types';

/**
 * Daily limit for generation runs per user.
 */
const DAILY_GENERATION_LIMIT = 10;

/**
 * Service function to trigger sentence generation for a set.
 * 
 * Implements:
 * - Set ownership verification
 * - Daily generation limit enforcement (≤10 per user)
 * - Idempotency key checking (unique per user + day)
 * - Set words validation (must have at least 1 word)
 * - Generation run creation with words snapshot
 * - Event logging
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param setId - UUID of the set to generate sentences for
 * @param command - Generation parameters (model_id, temperature, prompt_version)
 * @param idempotencyKey - Unique key for idempotent requests
 * @returns Generation response with sentences and usage stats
 * @throws Error with specific code for proper error mapping
 */
export async function triggerGeneration(
  supabase: SupabaseClient,
  userId: string,
  setId: string,
  command: SetGenerationCommand,
  idempotencyKey: string
): Promise<GenerationResponseDTO> {
  
  // Step 1: Verify set exists and user owns it
  const { data: setData, error: setError } = await supabase
    .from('sets')
    .select('id, name, user_id, words_count')
    .eq('id', setId)
    .eq('user_id', userId)
    .single();

  if (setError || !setData) {
    const error = new Error('Set not found or access denied');
    (error as any).code = 'SET_NOT_FOUND';
    throw error;
  }

  // Step 2: Check if set has words
  if (setData.words_count === 0) {
    const error = new Error('Set has no words to generate sentences for');
    (error as any).code = 'SET_HAS_NO_WORDS';
    throw error;
  }

  // Step 3: Check daily generation limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const { count: generationsToday, error: countError } = await supabase
    .from('generation_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('occurred_at', startOfDay.toISOString());

  if (countError) {
    console.error('Error checking daily limit:', countError);
    throw new Error('Failed to check daily generation limit');
  }

  if ((generationsToday ?? 0) >= DAILY_GENERATION_LIMIT) {
    const error = new Error('Daily generation limit reached');
    (error as any).code = 'DAILY_LIMIT_REACHED';
    throw error;
  }

  // Step 4: Check idempotency - if this key was already used, return existing result
  const { data: existingRun, error: idempotencyError } = await supabase
    .from('generation_runs')
    .select(`
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
    `)
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (idempotencyError) {
    console.error('Error checking idempotency:', idempotencyError);
    throw new Error('Failed to check idempotency key');
  }

  if (existingRun) {
    // Return existing generation result
    const remainingGenerations = DAILY_GENERATION_LIMIT - ((generationsToday ?? 0) + 1);
    
    return {
      generation_id: existingRun.id,
      set_id: existingRun.set_id,
      occurred_at: existingRun.occurred_at,
      sentences: (existingRun.sentences as any[]).map((s) => ({
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
    .from('words')
    .select('id, pl, en')
    .eq('set_id', setId)
    .order('created_at', { ascending: true });

  if (wordsError || !words || words.length === 0) {
    console.error('Error fetching words:', wordsError);
    throw new Error('Failed to fetch words for generation');
  }

  // Step 6: Create words snapshot (format: {pl, en})
  const wordsSnapshot = words.map((w) => ({
    pl: w.pl,
    en: w.en,
  }));

  // Step 7: Create generation_run record
  // Note: For now, we use placeholder values for tokens and cost
  // In a real implementation, these would be populated after LLM call
  const { data: generationRun, error: runError } = await supabase
    .from('generation_runs')
    .insert({
      user_id: userId,
      set_id: setId,
      model_id: command.model_id,
      temperature: command.temperature,
      prompt_version: command.prompt_version,
      idempotency_key: idempotencyKey,
      words_snapshot: wordsSnapshot as any,
      tokens_in: 0, // TODO: Update after LLM call
      tokens_out: 0, // TODO: Update after LLM call
      cost_usd: 0, // TODO: Calculate after LLM call
    })
    .select('id, set_id, occurred_at')
    .single();

  if (runError) {
    // Check for duplicate idempotency key (race condition)
    if (runError.code === '23505' && runError.message.includes('generation_runs_user_id_idempotency_key_key')) {
      const error = new Error('Duplicate idempotency key');
      (error as any).code = 'DUPLICATE_IDEMPOTENCY_KEY';
      throw error;
    }
    
    console.error('Error creating generation run:', runError);
    throw new Error('Failed to create generation run');
  }

  // Step 8: TODO - Call LLM to generate sentences
  // For now, we'll create placeholder sentences
  const sentencesToInsert = words.map((word) => ({
    generation_id: generationRun.id,
    word_id: word.id,
    pl_text: `Przykładowe zdanie dla: ${word.pl}`, // TODO: Replace with LLM-generated text
    target_en: word.en,
  }));

  const { data: sentences, error: sentencesError } = await supabase
    .from('sentences')
    .insert(sentencesToInsert)
    .select('id, word_id, pl_text, target_en');

  if (sentencesError) {
    console.error('Error inserting sentences:', sentencesError);
    throw new Error('Failed to insert generated sentences');
  }

  // Step 9: Log event to event_log
  try {
    await supabase.from('event_log').insert({
      user_id: userId,
      event_type: 'generation_run_created',
      entity_id: generationRun.id,
    });
  } catch (logError) {
    console.error('Error logging event:', logError);
    // Ignore logging errors
  }

  // Step 10: Calculate remaining generations
  const remainingGenerations = DAILY_GENERATION_LIMIT - ((generationsToday ?? 0) + 1);

  // Step 11: Return response
  return {
    generation_id: generationRun.id,
    set_id: generationRun.set_id,
    occurred_at: generationRun.occurred_at,
    sentences: sentences.map((s) => ({
      sentence_id: s.id,
      word_id: s.word_id,
      pl_text: s.pl_text,
      target_en: s.target_en,
    })),
    usage: {
      tokens_in: 0, // TODO: Update with actual values
      tokens_out: 0, // TODO: Update with actual values
      cost_usd: 0, // TODO: Calculate actual cost
      remaining_generations_today: remainingGenerations,
    },
  };
}

