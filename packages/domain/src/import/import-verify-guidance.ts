export type ImportVerifyGuidanceCode =
  | "mileage_cross_day"
  | "missing_shop_location"
  | "owner_reported_service"
  | "owner_diy_service"
  | "state_inspection_record";

export type ImportVerifyGuidance = {
  code: ImportVerifyGuidanceCode;
  title: string;
  detail: string;
  resolve: string;
};

export const mileageCrossDayGuidance = (input: {
  mileage: number;
  priorDaysMax: number;
  serviceDate: string;
}): ImportVerifyGuidance => ({
  code: "mileage_cross_day",
  title: "Odometer lower than an earlier dated visit",
  detail: `This row shows ${input.mileage.toLocaleString()} mi on ${input.serviceDate}, but an earlier visit in your CARFAX history already reached ${input.priorDaysMax.toLocaleString()} mi. CARFAX is usually right — this is often a typo or a duplicate same-period entry.`,
  resolve:
    "Quick check: match your CARFAX printout. If the mileage is correct, leave it checked and import. If not, fix the number or uncheck this row.",
});

export const missingShopLocationGuidance = (shop: string): ImportVerifyGuidance => ({
  code: "missing_shop_location",
  title: "Shop city not filled in yet",
  detail: `We could not confidently place ${shop} on the map from your saved shops or geocoding.`,
  resolve:
    "Pick a suggested city below, type City, ST once, or uncheck if you do not want this visit. We remember confirmed shops for your next import.",
});

export const ownerReportedServiceGuidance = (): ImportVerifyGuidance => ({
  code: "owner_reported_service",
  title: "Owner-reported maintenance",
  detail:
    "CARFAX identifies this work as self-reported, rather than a record from a named service provider.",
  resolve:
    "Confirm it only if you recognize the work. It will then be allowed to inform your maintenance history.",
});

export const ownerDiyServiceGuidance = (): ImportVerifyGuidance => ({
  code: "owner_diy_service",
  title: "DIY maintenance",
  detail:
    "CARFAX identifies this work as owner DIY, so there is no shop record or map location to independently validate.",
  resolve:
    "Confirm it only if you recognize the work. It will then be allowed to inform your maintenance history.",
});

export const stateInspectionRecordGuidance = (): ImportVerifyGuidance => ({
  code: "state_inspection_record",
  title: "State inspection record",
  detail:
    "CARFAX identifies this as a Massachusetts inspection entry, not service from a named shop. No individual location can be map-verified.",
  resolve:
    "Confirm it if you recognize the inspection. We will keep the source distinction visible in your history.",
});

export const guidanceSummaryLine = (guidance: ImportVerifyGuidance): string => guidance.title;
