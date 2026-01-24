import type { SupabaseClient } from "../../../db/supabase.client";

/**
 * Helper function to check if a set has an active exercise session.
 *
 * An active session is one where finished_at is NULL.
 * This is used as a business guard to prevent updates/deletes during active sessions.
 *
 * @param supabase - Authenticated Supabase client
 * @param setId - Set UUID to check
 * @returns true if there's an active session, false otherwise
 */
export async function checkActiveSession(supabase: SupabaseClient, setId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("exercise_sessions")
    .select("id")
    .eq("set_id", setId)
    .is("finished_at", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking active session:", error);
    // In case of error, we assume there's no active session
    // This is a safer default than blocking the operation
    return false;
  }

  return data !== null;
}
