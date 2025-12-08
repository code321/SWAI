import type { SupabaseClient } from '../../../db/supabase.client';
import type { UsageDailyDTO } from '../../../types';

/**
 * Daily limit for generation runs per user.
 */
const DAILY_GENERATION_LIMIT = 10;

/**
 * Service function to get daily generation usage for a user.
 * 
 * Implements:
 * - Count today's generation runs
 * - Calculate remaining generations
 * - Determine next reset time (midnight in user's timezone)
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param timezone - User's timezone for calculating reset time
 * @returns Usage stats for today
 * @throws Error if database query fails
 */
export async function getDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  timezone: string = 'UTC'
): Promise<UsageDailyDTO> {
  // Calculate start of day in UTC
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Count generations today
  const { count: generationsToday, error: countError } = await supabase
    .from('generation_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('occurred_at', startOfDay.toISOString());

  if (countError) {
    console.error('Error counting daily generations:', countError);
    throw new Error('Failed to fetch daily usage stats');
  }

  const used = generationsToday ?? 0;
  const remaining = Math.max(0, DAILY_GENERATION_LIMIT - used);

  // Calculate next reset (start of next day in UTC)
  const nextReset = new Date(now);
  nextReset.setDate(nextReset.getDate() + 1);
  nextReset.setHours(0, 0, 0, 0);

  return {
    limit: DAILY_GENERATION_LIMIT,
    used,
    remaining,
    next_reset_at: nextReset.toISOString(),
  };
}

