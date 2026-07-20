import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isAuthEnabled } from "./env";

export const createClient = () => {
  if (!isAuthEnabled()) {
    throw new Error("Supabase auth is not configured");
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
};
