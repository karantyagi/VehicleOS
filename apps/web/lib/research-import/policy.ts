import { RESEARCH_COHORT_SURFACE } from "./types";

export type ResearchParticipant = {
  id: string;
  email: string | null;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const parseResearchAllowlist = (value: string | undefined): ReadonlySet<string> =>
  new Set(
    (value ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );

export const isResearchCohortSurface = (
  surface = process.env.APP_SURFACE,
): boolean => surface === RESEARCH_COHORT_SURFACE;

export const isResearchCohortPathAllowed = (pathname: string): boolean =>
  pathname === "/" ||
  pathname === "/login" ||
  pathname === "/research/admin" ||
  pathname === "/research/account" ||
  pathname.startsWith("/auth/") ||
  pathname === "/api/health" ||
  pathname.startsWith("/api/research/");

export const isResearchParticipantAllowed = (
  participant: ResearchParticipant | null,
  options: {
    allowlist?: string | undefined;
    authDisabled?: string | undefined;
  } = {},
): boolean => {
  if (!participant) return false;
  if ((options.authDisabled ?? process.env.AUTH_DISABLED) === "true") return true;
  if (!participant.email) return false;

  const allowlist = parseResearchAllowlist(options.allowlist ?? process.env.RESEARCH_COHORT_ALLOWLIST);
  return allowlist.has(normalizeEmail(participant.email));
};

export const isResearchOperatorAllowed = (
  participant: ResearchParticipant | null,
  options: {
    allowlist?: string | undefined;
    authDisabled?: string | undefined;
  } = {},
): boolean => {
  if (!participant) return false;
  if ((options.authDisabled ?? process.env.AUTH_DISABLED) === "true") return true;
  if (!participant.email) return false;

  const allowlist = parseResearchAllowlist(options.allowlist ?? process.env.RESEARCH_OPERATOR_ALLOWLIST);
  return allowlist.has(normalizeEmail(participant.email));
};

export const researchAccessFailure = (
  participant: ResearchParticipant | null,
): "not-research-surface" | "sign-in-required" | "not-invited" | null => {
  if (!isResearchCohortSurface()) return "not-research-surface";
  if (!participant) return "sign-in-required";
  if (!isResearchParticipantAllowed(participant)) return "not-invited";
  return null;
};
