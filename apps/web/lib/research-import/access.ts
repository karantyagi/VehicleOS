import { getSessionUser } from "../auth/session";
import { researchAccessFailure, type ResearchParticipant } from "./policy";

export type ResearchAccess =
  | { ok: true; participant: ResearchParticipant }
  | { ok: false; reason: "not-research-surface" | "sign-in-required" | "not-invited" };

export const getResearchAccess = async (): Promise<ResearchAccess> => {
  const user = await getSessionUser();
  const reason = researchAccessFailure(user);
  if (reason || !user) {
    return { ok: false, reason: reason ?? "sign-in-required" };
  }
  return { ok: true, participant: user };
};
