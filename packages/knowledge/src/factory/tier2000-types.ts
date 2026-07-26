export type Tier2000OemFamily =
  | "toyota"
  | "honda"
  | "hyundai"
  | "kia"
  | "nissan"
  | "mazda"
  | "subaru"
  | "vw"
  | "ford"
  | "chevy"
  | "jeep"
  | "lexus"
  | "acura"
  | "tesla"
  | "ev-generic"
  | "bmw"
  | "mercedes"
  | "audi"
  | "genesis"
  | "volvo"
  | "cadillac"
  | "lincoln"
  | "infiniti"
  | "porsche"
  | "mini"
  | "land_rover"
  | "jaguar"
  | "alfa_romeo"
  | "buick"
  | "chrysler"
  | "mitsubishi";

export type Tier2000ScheduleKind =
  | "maintenance_minder"
  | "fixed_interval"
  | "ev_simplified"
  | "cbs_condition_based"
  | "assyst_plus";

export type Tier2000PackSpec = {
  packId: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain?: string;
  oemFamily: Tier2000OemFamily;
  scheduleKind: Tier2000ScheduleKind;
  segment?: string;
  priority?: number;
  manualSharePolicy?: string;
};

export type Tier2000SourceRow = {
  packId: string;
  sourceTier: "A" | "B" | "C" | "D" | "";
  primaryPdfUrl: string;
  alternatePdfUrls: string[];
  confidence: number;
  manualShareApplied: boolean;
  sharedFromPackId: string;
  maintenanceSectionTitle: string;
  blockedReason: string;
};

/** Map registry schedule kinds to pack schema scheduleKind. */
export const packScheduleKind = (
  kind: Tier2000ScheduleKind,
): "maintenance_minder" | "fixed_interval" | "ev_simplified" => {
  if (kind === "maintenance_minder") return "maintenance_minder";
  if (kind === "ev_simplified") return "ev_simplified";
  return "fixed_interval";
};
