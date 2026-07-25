import type { ImportTrustTier } from "./tier-import-rows.js";
import type { ImportVerifyGuidanceCode } from "./import-verify-guidance.js";

export type ImportReviewVerdictStatus = "clear" | "still_flagged";

export type ImportReviewVerdict = {
  status: ImportReviewVerdictStatus;
  message: string;
};

const stillFlaggedMessage = (codes: ImportVerifyGuidanceCode[]): string => {
  const hasMileage = codes.includes("mileage_cross_day");
  const hasLocation = codes.includes("missing_shop_location");

  if (hasMileage && hasLocation) {
    return "Still needs a mileage check and shop city before this can move to ready.";
  }
  if (hasMileage) {
    return "Mileage still looks lower than an earlier dated visit — compare your CARFAX printout.";
  }
  if (hasLocation) {
    return "Shop city is still empty — pick a suggestion below or type City, ST.";
  }
  return "One more quick check before this moves to ready.";
};

const clearMessage = (priorCodes: ImportVerifyGuidanceCode[]): string => {
  const hadMileage = priorCodes.includes("mileage_cross_day");
  const hadLocation = priorCodes.includes("missing_shop_location");

  if (hadMileage && hadLocation) {
    return "Looks good — mileage and shop city check out. Tap below when you're ready to import.";
  }
  if (hadMileage) {
    return "Looks good — mileage is consistent with your earlier visits. Tap below when you're ready to import.";
  }
  if (hadLocation) {
    return "Looks good — shop location is set and we'll remember it next time. Tap below when you're ready to import.";
  }
  return "Looks good — this visit checks out. Tap below when you're ready to import.";
};

/** Owner edited a flagged row — assistant re-checks whether it can graduate from review. */
export const evaluateImportReviewVerdict = (input: {
  tier: ImportTrustTier;
  ownerGuidance: { code: ImportVerifyGuidanceCode }[];
  priorGuidanceCodes?: ImportVerifyGuidanceCode[];
}): ImportReviewVerdict => {
  if (input.tier === "block") {
    return {
      status: "still_flagged",
      message: "Required fields are still missing — fix them or uncheck to skip this visit.",
    };
  }

  if (input.tier !== "verify") {
    return {
      status: "clear",
      message: clearMessage(input.priorGuidanceCodes ?? []),
    };
  }

  const codes = input.ownerGuidance.map((guidance) => guidance.code);
  return {
    status: "still_flagged",
    message: stillFlaggedMessage(codes),
  };
};

export const acceptImportRowAsReportedMessage = (): string =>
  "Got it — keeping this visit exactly as CARFAX reported.";
