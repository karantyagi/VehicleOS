import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, isAuthEnabled } from "./env";

export const createAdminClient = () => {
  if (!isAuthEnabled()) {
    throw new Error("Supabase auth is not configured");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
