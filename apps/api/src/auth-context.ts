import type { FastifyRequest } from "fastify";

export type AuthContext = {
  userId: string;
};

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000099";

export const authFromRequest = (request: FastifyRequest): AuthContext => {
  const header = request.headers["x-user-id"];
  if (typeof header === "string" && header.length > 0) {
    return { userId: header };
  }
  return { userId: TEST_USER_ID };
};
