import type { SessionUser } from "./types";

export type AuthContext = {
  userId: string;
};

export const toAuthContext = (user: SessionUser | null): AuthContext | undefined => {
  if (!user) return undefined;
  return { userId: user.id };
};

export const authFromHeader = (request: { headers: Record<string, unknown> }): AuthContext | undefined => {
  const userId = request.headers["x-user-id"];
  if (typeof userId === "string" && userId.length > 0) {
    return { userId };
  }
  return undefined;
};
