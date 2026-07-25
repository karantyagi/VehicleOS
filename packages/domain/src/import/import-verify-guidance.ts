export type ImportVerifyGuidanceCode = "mileage_cross_day" | "missing_shop_location";

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

export const guidanceSummaryLine = (guidance: ImportVerifyGuidance): string => guidance.title;
