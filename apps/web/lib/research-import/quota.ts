import { createHmac } from "node:crypto";

export const DEFAULT_RESEARCH_MAX_SUCCESSFUL_DRAFTS = 5;

export const researchDraftLimit = (value = process.env.RESEARCH_MAX_SUCCESSFUL_DRAFTS): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10 ? parsed : DEFAULT_RESEARCH_MAX_SUCCESSFUL_DRAFTS;
};

export const researchQuotaSubject = (email: string | null, secret = process.env.RESEARCH_QUOTA_HMAC_SECRET): string | null => {
  if (!email || !secret) return null;
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
};
