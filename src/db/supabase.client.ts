import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as BaseSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;

// Prefer the more privileged Service-Role key in server-side code to avoid
// Row-Level-Security errors during local development. It falls back to the
// anon key so the same client can still run in the browser when needed.
const supabaseKey =
  // Server-only env var – never exposed to client code unless you import this file there
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ??
  // Fallback – public anon key (read-only / RLS-enforced)
  import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env vars missing – check .env file");
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // We never persist sessions on the server
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type SupabaseClient = BaseSupabaseClient<Database>;
