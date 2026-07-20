import { createClient } from "../supabase/server";
import { getDevUser } from "./types";
import type { SessionUser } from "./types";
import { isAuthEnabled } from "../supabase/env";

export type { SessionUser };

export const getSessionUser = async (): Promise<SessionUser | null> => {
  if (!isAuthEnabled()) return getDevUser();

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
  };
};

export const requireSessionUser = async (): Promise<SessionUser | null> => {
  return getSessionUser();
};
