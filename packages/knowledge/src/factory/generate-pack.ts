import type { OemSchedulePack, OemSchedulePackEntry } from "../types.js";
import type { Tier1PackSpec } from "./tier1-manifest.js";
import type { Tier2000PackSpec } from "./tier2000-types.js";
import { packScheduleKind } from "./tier2000-types.js";

type PackSpec = Pick<
  Tier1PackSpec | Tier2000PackSpec,
  "packId" | "make" | "model" | "year" | "trim" | "powertrain" | "oemFamily" | "scheduleKind"
>;

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

const acuraMinderEntries = (spec: Pick<PackSpec, "trim" | "powertrain">): OemSchedulePackEntry[] => {
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
        0.92,
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
    0.92,
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
    0.92,
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
    0.92,
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
    0.92,
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
    0.92,
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
    0.92,
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
    0.92,
  ),
];

const bmwCbsEntries = (family: "bmw" | "mini"): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: `${family}.cbs.engine_oil`,
      serviceName: "Engine oil and filter change (CBS)",
      intervalMiles: null,
      intervalMonths: 12,
      sourcePage: "BMW Maintenance System — Engine oil service",
      ruleId: "knowledge.policy.engine-oil.v1",
      projectionNote: "CBS condition-based trigger; miles are assistant projection.",
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
      sourcePage: "BMW Maintenance System — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "brake-fluid",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid",
      intervalMiles: null,
      intervalMonths: 24,
      sourcePage: "BMW Maintenance System — Brake fluid",
      ruleId: "knowledge.policy.brake-fluid.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "vehicle-check",
      canonicalServiceId: `${family}.cbs.vehicle_check`,
      serviceName: "Vehicle check (CBS)",
      intervalMiles: null,
      intervalMonths: 12,
      sourcePage: "BMW Maintenance System — Vehicle check",
      ruleId: "knowledge.policy.vehicle-check.v1",
      projectionNote: "CBS condition-based trigger; miles are assistant projection.",
    },
    0.92,
  ),
];

const mercedesAssystEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "mercedes.assyst.engine_oil",
      serviceName: "Engine oil and filter change (Assyst Plus)",
      intervalMiles: 10000,
      intervalMonths: 12,
      sourcePage: "Assyst Plus — Engine oil service",
      ruleId: "knowledge.policy.engine-oil.v1",
      projectionNote: "Assyst Plus flexible service; miles are assistant projection.",
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
      sourcePage: "Assyst Plus — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "brake-fluid",
      canonicalServiceId: "generic.brake_fluid",
      serviceName: "Replace brake fluid",
      intervalMiles: null,
      intervalMonths: 24,
      sourcePage: "Assyst Plus — Brake fluid",
      ruleId: "knowledge.policy.brake-fluid.v1",
    },
    0.92,
  ),
];

const audiFixedEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "audi.fixed.10000.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 10000,
      intervalMonths: 12,
      sourcePage: "Fixed interval service — Engine oil",
      ruleId: "knowledge.policy.engine-oil.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "tire-rotation",
      canonicalServiceId: "generic.tire_rotation",
      serviceName: "Rotate tires",
      intervalMiles: 5000,
      intervalMonths: 6,
      sourcePage: "Fixed interval service — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
  entry(
    {
      entryId: "cabin-air-filter",
      canonicalServiceId: "generic.cabin_air_filter",
      serviceName: "Replace cabin air filter",
      intervalMiles: 20000,
      intervalMonths: 24,
      sourcePage: "Fixed interval service — Cabin air filter",
      ruleId: "knowledge.policy.cabin-filter.v1",
    },
    0.92,
  ),
];

const volvoFixedEntries = (): OemSchedulePackEntry[] => [
  entry(
    {
      entryId: "engine-oil",
      canonicalServiceId: "volvo.fixed.10000.engine_oil",
      serviceName: "Engine oil and filter change",
      intervalMiles: 10000,
      intervalMonths: 12,
      sourcePage: "Service schedule — Engine oil",
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
      sourcePage: "Service schedule — Tire rotation",
      ruleId: "knowledge.policy.tire-rotation.v1",
    },
    0.92,
  ),
];

const luxuryDomesticEntries = (family: string): OemSchedulePackEntry[] => {
  const baseFamily = ["cadillac", "chevy", "buick"].includes(family) ? "chevy" : "ford";
  return domesticEntries(baseFamily).map((row) => ({
    ...row,
    canonicalServiceId: row.canonicalServiceId.replace(/^(chevy|ford)\./, `${family}.`),
    sourcePage: row.sourcePage.replace("Scheduled Maintenance", "Maintenance schedule"),
  }));
};

const resolveEntries = (spec: PackSpec): OemSchedulePackEntry[] => {
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
    case "bmw":
      return bmwCbsEntries("bmw");
    case "mini":
      return bmwCbsEntries("mini");
    case "mercedes":
      return mercedesAssystEntries();
    case "audi":
    case "porsche":
    case "alfa_romeo":
      return audiFixedEntries().map((row) => ({
        ...row,
        canonicalServiceId: row.canonicalServiceId.replace(/^audi\./, `${spec.oemFamily}.`),
      }));
    case "genesis":
      return hyundaiKiaEntries("hyundai").map((row) => ({
        ...row,
        canonicalServiceId: row.canonicalServiceId.replace(/^hyundai\./, "genesis."),
        sourcePage: row.sourcePage.replace("Normal maintenance schedule", "Genesis maintenance schedule"),
      }));
    case "volvo":
      return volvoFixedEntries();
    case "cadillac":
    case "lincoln":
    case "infiniti":
    case "land_rover":
    case "jaguar":
    case "buick":
    case "chrysler":
    case "mitsubishi":
      return luxuryDomesticEntries(spec.oemFamily);
    default:
      return toyotaFixedEntries();
  }
};

const buildPack = (
  spec: PackSpec,
  qaStatus: OemSchedulePack["qaStatus"],
  qaNotes: string,
  scheduleKind: OemSchedulePack["scheduleKind"],
): OemSchedulePack => ({
  packId: spec.packId,
  version: 1,
  manualTitle: `${spec.year} ${spec.make} ${spec.model} ${spec.trim} — Owner's Manual maintenance schedule (U.S.)`,
  scheduleKind,
  qaStatus,
  qaNotes,
  sourceManifestRef: `sources/manifest.json#${spec.packId}`,
  vehicle: {
    make: spec.make,
    model: spec.model,
    year: spec.year,
    trim: spec.trim,
    powertrain: spec.powertrain,
    market: "US",
  },
  entries: resolveEntries(spec),
});

export const generateTier1Pack = (spec: Tier1PackSpec): OemSchedulePack =>
  buildPack(
    spec,
    "creator_review_required",
    "Tier-1 factory template — creator review required. Promote to auto_verified only after PDF dual-extract QA (B1–B5).",
    spec.scheduleKind,
  );

export const generateTier2000Pack = (
  spec: Tier2000PackSpec,
  options: { qaStatus?: OemSchedulePack["qaStatus"] } = {},
): OemSchedulePack => {
  const qaStatus: OemSchedulePack["qaStatus"] =
    options.qaStatus ?? "creator_review_required";

  const qaNotes =
    qaStatus === "auto_verified"
      ? "Preserved factory-verified status."
      : "Tier-2 catalog pack — creator review required until Phase A+B dual-extract verify and promotion.";

  return buildPack(spec, qaStatus, qaNotes, packScheduleKind(spec.scheduleKind));
};
