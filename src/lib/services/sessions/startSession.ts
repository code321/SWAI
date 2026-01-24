import type { SupabaseClient } from "../../../db/supabase.client";
import type { SessionCreateCommand, SessionCreateResponseDTO } from "../../../types";

/**
 * Service function to start a new exercise session.
 *
 * Implements:
 * - Check for existing active session (prevents concurrent sessions)
 * - Validates set ownership
 * - Validates generation_id or fetches latest generation
 * - Creates exercise_sessions record
 * - Counts pending sentences for the session
 * - Optional event logging
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - Current user ID from auth token
 * @param command - Session creation command (set_id, generation_id?, mode)
 * @returns Created session summary
 * @throws Error with specific code for proper error mapping
 */
export async function startSession(
  supabase: SupabaseClient,
  userId: string,
  command: SessionCreateCommand
): Promise<SessionCreateResponseDTO> {
  const { set_id, generation_id, mode } = command;

  // Step 1: Check for existing active session for this user and set
  // An active session is one where finished_at IS NULL
  const { data: activeSessions, error: activeCheckError } = await supabase
    .from("exercise_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("set_id", set_id)
    .is("finished_at", null)
    .limit(1);

  if (activeCheckError) {
    console.error("Error checking for active sessions:", activeCheckError);
    throw new Error("Failed to check for active sessions");
  }

  if (activeSessions && activeSessions.length > 0) {
    const error = new Error("An active session already exists for this set");
    (error as any).code = "SESSION_ALREADY_RUNNING";
    throw error;
  }

  // Step 2: Verify set ownership
  const { data: setData, error: setError } = await supabase
    .from("sets")
    .select("id")
    .eq("id", set_id)
    .eq("user_id", userId)
    .single();

  if (setError || !setData) {
    const error = new Error("Set not found or access denied");
    (error as any).code = "SET_NOT_FOUND";
    throw error;
  }

  // Step 3: Determine generation_id (use provided or fetch latest)
  let finalGenerationId = generation_id;

  if (!finalGenerationId) {
    // Fetch the most recent generation for this set
    const { data: latestGen, error: genError } = await supabase
      .from("generation_runs")
      .select("id")
      .eq("set_id", set_id)
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .single();

    if (genError || !latestGen) {
      const error = new Error("No generation found for this set. Please generate sentences first.");
      (error as any).code = "NO_GENERATION_FOUND";
      throw error;
    }

    finalGenerationId = latestGen.id;
  } else {
    // Validate provided generation_id belongs to user and set
    const { data: genData, error: genError } = await supabase
      .from("generation_runs")
      .select("id")
      .eq("id", finalGenerationId)
      .eq("set_id", set_id)
      .eq("user_id", userId)
      .single();

    if (genError || !genData) {
      const error = new Error("Generation not found or access denied");
      (error as any).code = "GENERATION_NOT_FOUND";
      throw error;
    }
  }

  // Step 4: Create exercise_sessions record
  const { data: sessionData, error: sessionError } = await supabase
    .from("exercise_sessions")
    .insert({
      user_id: userId,
      set_id: set_id,
      generation_id: finalGenerationId,
    })
    .select("id, set_id, generation_id, started_at")
    .single();

  if (sessionError || !sessionData) {
    console.error("Error creating exercise session:", sessionError);
    throw new Error("Failed to create exercise session");
  }

  // Step 5: Count pending sentences for this generation
  const { count: sentencesCount, error: countError } = await supabase
    .from("sentences")
    .select("id", { count: "exact", head: true })
    .eq("generation_id", finalGenerationId)
    .eq("user_id", userId);

  if (countError) {
    console.error("Error counting sentences:", countError);
    // Non-critical, we can continue with 0
  }

  const pendingSentences = sentencesCount ?? 0;

  // Step 6: Optional - Log event to event_log
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_type: "session_started",
      entity_id: sessionData.id,
    });
  } catch (logError) {
    console.error("Error logging event:", logError);
    // Ignore logging errors
  }

  // Return the created session summary
  return {
    id: sessionData.id,
    set_id: sessionData.set_id,
    generation_id: sessionData.generation_id,
    started_at: sessionData.started_at,
    pending_sentences: pendingSentences,
  };
}
