import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "./env";

export function createAdminClient() {
  const { url, secretKey } = getServerSupabaseEnv();

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "api-teresita-server" },
    },
  });
}
