import type { OemSchedulePack, OemSchedulePackEntry } from "../types.js";
import type { Tier1PackSpec } from "./tier1-manifest.js";

type EntryDraft = Omit<OemSchedulePackEntry, "confidence"> & { confidence?: number };

const entry = (draft: EntryDraft, defaultConfidence: number): OemSchedulePackEntry => ({
  ...draft,
  confidence: draft.confidence ?? defaultConfidence,
});

const toyotaFixedEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "toyota.mr.10000.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 10000,
      intervalMonths: 6,
      sourcePage: "Maintenance Schedule — Normal driving",
      ruleId: "knowledge.policy.toyota-oil.v1",
      projectionNote: "Toyota 10k/6mo normal; 5k severe driving per owner manual.",
    },
    0.93,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 5000,
      intervalMonths: 6,
      sourcePage: "Maintenance Schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.94,
  ),
  entry(
    {
      entryId: "cabin-air-filter",
      canonicalServiceId: "generic.cabin_air_filter",
      serviceName: "Replace cabin air filter",
      intervalMiles: 20000,
      intervalMonths: 24,
      sourcePage: "Maintenance Schedule — Cabin filter",
      ruleId: "knowledge.policy.cabin-filter.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "engine-air-filter",
      canonicalServiceId: "generic.engine_air_filter",
      serviceName: "Replace engine air filter",
      intervalMiles: 30000,
      intervalMonths: 36,
      sourcePage: "Maintenance Schedule — Engine air filter",
      ruleId: "knowledge.policy.engine-air-filter.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "brake-fluid",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid",
      intervalMiles: null,
      intervalMonths: 36,
      sourcePage: "Maintenance Schedule — Brake fluid",
      ruleId: "knowledge.policy.brake-fluid.v1",
    },
    0.92,
  ),
];

const hondaMinderEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "code-a",
      canonicalServiceId: "honda.mm.a.engine_oil",
      serviceName: "Replace engine oil (Maintenance Minder A)",
      intervalMiles: 10000,
      intervalMonths: 12,
      sourcePage: "Maintenance Minder — Code A",
      ruleId: "knowledge.policy.code-a.v1",
      mainItemCode: "A",
    },
    0.94,
  ),
  entry(
    {
      entryId: "code-b",
      canonicalServiceId: "honda.mm.b.oil_filter",
      serviceName: "Replace engine oil and filter (Maintenance Minder B)",
      intervalMiles: 10000,
      intervalMonths: 12,
      sourcePage: "Maintenance Minder — Code B",
      ruleId: "knowledge.policy.code-b.v1",
      mainItemCode: "B",
    },
    0.94,
  ),
  entry(
    {
      entryId: "mm-sub-1",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires (Maintenance Minder sub 1)",
      intervalMiles: 7500,
      intervalMonths: 12,
      sourcePage: "Maintenance Minder — Sub 1",
      ruleId: "knowledge.policy.mm-sub-1.v1",
      subItemCode: "1",
    },
    0.93,
  ),
  entry(
    {
      entryId: "mm-sub-7",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid (Maintenance Minder sub 7)",
      intervalMiles: null,
      intervalMonths: 36,
      sourcePage: "Maintenance Minder — Sub 7",
      ruleId: "knowledge.policy.mm-sub-7.v1",
      subItemCode: "7",
    },
    0.92,
  ),
];

const acuraMinderEntries = (spec: Tier1PackSpec): OemSchedulePackEntry[] => {
  const entries = hondaMinderEntries().map((row) => ({
    ...row,
    canonicalServiceId: row.canonicalServiceId.replace(/^honda\./, "acura."),
    sourcePage: row.sourcePage.replace("Maintenance Minder", "Acura Maintenance Minder"),
  }));

  if (spec.trim.toLowerCase().includes("sh-awd")) {
    entries.push(
      entry(
        {
          entryId: "mm-sub-3",
          canonicalServiceId: "acura.mm.3.transmission_transfer",
          serviceName: "Replace transmission and transfer fluid (Maintenance Minder sub 3)",
          intervalMiles: 30000,
          intervalMonths: 36,
          sourcePage: "Acura Maintenance Minder — Sub 3",
          ruleId: "knowledge.policy.mm-sub-3.v1",
          subItemCode: "3",
          powertrain: spec.powertrain,
        },
        0.91,
      ),
    );
  }

  return entries;
};

const hyundaiKiaEntries = (family: "hyundai" | "kia"): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: `${family}.fixed.8000.engine_oil`,
      serviceName: "Engine oil and filter change",
      intervalMiles: 8000,
      intervalMonths: 6,
      sourcePage: "Normal maintenance schedule — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Normal maintenance schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "cabin-air-filter",
      canonicalServiceId: "generic.cabin_air_filter",
      serviceName: "Replace cabin air filter",
      intervalMiles: 15000,
      intervalMonths: 12,
      sourcePage: "Normal maintenance schedule — Cabin air filter",
      ruleId: "knowledge.policy.cabin-filter.v1",
    },
    0.91,
  ),
];

const nissanEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "nissan.fixed.5000.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 5000,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.91,
  ),
];

const mazdaEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "mazda.fixed.7500.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
];

const subaruEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "subaru.fixed.6000.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 6000,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 6000,
      intervalMonths: 6,
      sourcePage: "Maintenance schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
];

const domesticEntries = (family: "ford" | "chevy" | "jeep" | "vw"): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: `${family}.olm.engine_oil`,
      serviceName: "Engine oil and filter change (Oil Life Monitor)",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Scheduled Maintenance — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
      projectionNote: "OEM trigger is oil life %; miles are assistant projection.",
    },
    0.91,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "Scheduled Maintenance — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.91,
  ),
];

const lexusEntries = (): OemSchedulePackEntry[] =>
  toyotaFixedEntries().map((row) => ({
    ...row,
    canonicalServiceId: row.canonicalServiceId.replace(/^toyota\./, "lexus."),
    sourcePage: row.sourcePage.replace("Maintenance Schedule", "Lexus maintenance schedule"),
  }));

const teslaEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 6250,
      intervalMonths: 6,
      sourcePage: "Maintenance — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.93,
  ),
  entry(
    {
      entryId: "cabin-air-filter",
      canonicalServiceId: "ev.tesla.cabin_filter",
      serviceName: "Replace cabin air filter",
      intervalMiles: 20000,
      intervalMonths: 24,
      sourcePage: "Maintenance — Cabin air filter",
      ruleId: "knowledge.policy.cabin-filter.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "brake-fluid",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid",
      intervalMiles: null,
      intervalMonths: 48,
      sourcePage: "Maintenance — Brake fluid",
      ruleId: "knowledge.policy.brake-fluid.v1",
    },
    0.92,
  ),
];

const evGenericEntries = (family: string): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 7500,
      intervalMonths: 6,
      sourcePage: "EV maintenance schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.91,
  ),
  entry(
    {
      entryId: "cabin-air-filter",
      canonicalServiceId: "ev.cabin_filter",
      serviceName: "Replace cabin air filter",
      intervalMiles: 15000,
      intervalMonths: 12,
      sourcePage: "EV maintenance schedule — Cabin air filter",
      ruleId: "knowledge.policy.cabin-filter.v1",
    },
    0.91,
  ),
  entry(
    {
      entryId: "brake-fluid",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid",
      intervalMiles: null,
      intervalMonths: 36,
      sourcePage: "EV maintenance schedule — Brake fluid",
      ruleId: "knowledge.policy.brake-fluid.v1",
    },
    0.9,
  ),
];

const resolveEntries = (spec: Tier1PackSpec): OemSchedulePackEntry[] => {
  switch (spec.oemFamily) {
    case "toyota":
      return toyotaFixedEntries();
    case "honda":
      return hondaMinderEntries();
    case "acura":
      return acuraMinderEntries(spec);
    case "hyundai":
      return hyundaiKiaEntries("hyundai");
    case "kia":
      return hyundaiKiaEntries("kia");
    case "nissan":
      return nissanEntries();
    case "mazda":
      return mazdaEntries();
    case "subaru":
      return subaruEntries();
    case "ford":
      return domesticEntries("ford");
    case "chevy":
      return domesticEntries("chevy");
    case "jeep":
      return domesticEntries("jeep");
    case "vw":
      return domesticEntries("vw");
    case "lexus":
      return lexusEntries();
    case "tesla":
      return teslaEntries();
    case "ev-generic":
      return evGenericEntries(spec.make);
    default:
      return toyotaFixedEntries();
  }
};

export const generateTier1Pack = (spec: Tier1PackSpec): OemSchedulePack => {
  const entries = resolveEntries(spec);
  const qaStatus: OemSchedulePack["qaStatus"] = "creator_review_required";

  return {
    packId: spec.packId,
    version: 1,
    manualTitle: `${spec.year} ${spec.make} ${spec.model} ${spec.trim} — Owner's Manual maintenance schedule (U.S.)`,
    scheduleKind: spec.scheduleKind,
    qaStatus,
    qaNotes:
      "Tier-1 factory template — creator review required. Promote to auto_verified only after PDF dual-extract QA (B1–B5).",
    sourceManifestRef: `sources/manifest.json#${spec.packId}`,
    vehicle: {
      make: spec.make,
      model: spec.model,
      year: spec.year,
      trim: spec.trim,
      powertrain: spec.powertrain,
      market: "US",
    },
    entries,
  };
};
