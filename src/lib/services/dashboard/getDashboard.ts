import type { SupabaseClient } from '../../../db/supabase.client';
import type { DashboardDTO } from '../../../types';
import { getDailyUsage } from '../usage/getDailyUsage';

/**
 * Service function to get dashboard data for a user.
 * 
 * Aggregates:
 * - Total number of sets
 * - Active exercise session (if any)
 * - Remaining generations for today
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @returns Dashboard data
 * @throws Error if database queries fail
 */
export async function getDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardDTO> {
  // Fetch total number of sets
  const { count: setsTotal, error: setsError } = await supabase
    .from('sets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (setsError) {
    console.error('Error counting sets:', setsError);
    throw new Error('Failed to fetch sets count');
  }

  // Fetch active session (if any)
  const { data: activeSessions, error: sessionError } = await supabase
    .from('exercise_sessions')
    .select('id, set_id, started_at')
    .eq('user_id', userId)
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  if (sessionError) {
    console.error('Error fetching active session:', sessionError);
    throw new Error('Failed to fetch active session');
  }

  const activeSession = activeSessions?.[0]
    ? {
        session_id: activeSessions[0].id,
        set_id: activeSessions[0].set_id,
        started_at: activeSessions[0].started_at,
      }
    : null;

  // Get remaining generations
  const usage = await getDailyUsage(supabase, userId);

  return {
    sets_total: setsTotal ?? 0,
    active_session: activeSession,
    remaining_generations: usage.remaining,
  };
}

