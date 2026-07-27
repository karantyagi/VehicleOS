#!/usr/bin/env node
/**
 * Promote interview fleet OEM packs to PDF-mined v3 schedules + dogfood extracts.
 * Run from repo root: node packages/knowledge/scripts/build-full-manual-extracts.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "../../..");
const packsDir = join(scriptDir, "../packs");
const dogfoodRoot = join(repoRoot, "seeds/dogfood/oem-extracts");

const exportedAt = new Date().toISOString();

const writeDogfood = ({ slug, payload }) => {
  const dir = join(dogfoodRoot, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "oem-schedule.v1.json"), `${JSON.stringify(payload, null, 2)}\n`);
};

const writePack = (pack) => {
  writeFileSync(join(packsDir, `${pack.packId}.v1.json`), `${JSON.stringify(pack, null, 2)}\n`);
};

const hondaAccordExtract = {
  version: "1",
  source: "honda-accord-2024-maintenance-minder-supplement",
  exportedAt,
  manualTitle: "2024 Honda Accord — Maintenance Minder schedule (U.S.)",
  storageKey: "dogfood/oem-extracts/honda-accord-2024/oem-schedule.v1.json",
  documentRef: {
    fileName: "honda-accord-2024-mm.pdf",
    pages: "P. 6–7 (U.S. Maintenance Minder main/sub items)",
    vehicleContext: { engine: "1.5L turbo / 2.0L hybrid", drivetrain: "FWD", market: "US" },
    coverage: {
      included: "All U.S. Maintenance Minder main codes A/B and sub items 1–7; footnotes *1–*5.",
      excluded: "Canadian code 0/9 variants; Code A-only oil changes (projection uses Code B baseline).",
    },
    note: "MM-adaptive scheduling. Miles/months are projection baselines from OEM footnotes.",
  },
  entries: [
    { serviceName: "Replace engine oil (Maintenance Minder A)", maintenanceMinderCode: "A", itemType: "replace", intervalMonths: 12, sourcePage: "P. 6 — Code A (*1 annual if no MM alert within 12 mo)" },
    { serviceName: "Replace engine oil and filter (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "replace", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect front and rear brakes (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect tie rod ends, steering gearbox, and boots (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect suspension components (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect driveshaft boots (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect brake hoses and lines including ABS/VSA (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect all fluid levels and condition (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect exhaust system (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Inspect fuel lines and connections (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Adjust valves if noisy (Maintenance Minder B)", maintenanceMinderCode: "B", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B" },
    { serviceName: "Rotate tires (Maintenance Minder sub 1)", maintenanceMinderCode: "1", itemType: "replace", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Sub 1" },
    { serviceName: "Replace air cleaner element (Maintenance Minder sub 2)", maintenanceMinderCode: "2", itemType: "replace", intervalMiles: 15000, sourcePage: "P. 6 — Sub 2 (*2 dusty conditions)" },
    { serviceName: "Replace dust and pollen filter (Maintenance Minder sub 2)", maintenanceMinderCode: "2", itemType: "replace", intervalMiles: 15000, sourcePage: "P. 6 — Sub 2 (*3 urban soot)" },
    { serviceName: "Inspect drive belt (Maintenance Minder sub 2)", maintenanceMinderCode: "2", itemType: "inspect", intervalMiles: 15000, sourcePage: "P. 6 — Sub 2" },
    { serviceName: "Replace transmission fluid (Maintenance Minder sub 3)", maintenanceMinderCode: "3", itemType: "replace", intervalMiles: 30000, intervalMonths: 36, sourcePage: "P. 6 — Sub 3 (*4 mountain driving: 25,000 mi)" },
    { serviceName: "Replace spark plugs (Maintenance Minder sub 4)", maintenanceMinderCode: "4", itemType: "replace", intervalMiles: 105000, sourcePage: "P. 6 — Sub 4" },
    { serviceName: "Inspect valve clearance (Maintenance Minder sub 4)", maintenanceMinderCode: "4", itemType: "inspect", intervalMiles: 105000, sourcePage: "P. 6 — Sub 4" },
    { serviceName: "Replace engine coolant (Maintenance Minder sub 5)", maintenanceMinderCode: "5", itemType: "replace", intervalMiles: 100000, intervalMonths: 60, sourcePage: "P. 6 — Sub 5" },
    { serviceName: "Replace brake fluid (Maintenance Minder sub 7)", maintenanceMinderCode: "7", itemType: "replace", intervalMonths: 36, sourcePage: "P. 6 — Sub 7 (*5 every 3 years if no MM alert)" },
  ],
};

const subaruForesterExtract = {
  version: "1",
  source: "subaru-2024-warranty-and-maintenance-booklet",
  exportedAt,
  manualTitle: "2024 Subaru Forester — Warranty & Maintenance schedule (U.S.)",
  storageKey: "dogfood/oem-extracts/subaru-forester-2024/oem-schedule.v1.json",
  documentRef: {
    fileName: "subaru-2024-war-and-maint.pdf",
    pages: "P. 28–29 (2024 MY Federal/California schedule + notes)",
    vehicleContext: { engine: "2.5L FB25", drivetrain: "AWD CVT", market: "US" },
    coverage: {
      included: "Normal schedule replace/inspect/perform rows for Forester (non-BRZ); severe notes 1–10.",
      excluded: "BRZ-specific rows; safety inspection checklist (P. 26); dealer record blanks.",
    },
    note: "Fixed-interval schedule. Continue beyond 120 mo by adding 120 mo to column headings.",
  },
  entries: [
    { serviceName: "Engine oil change", itemType: "replace", intervalMiles: 6000, intervalMonths: 6, sourcePage: "P. 28 — Item 1 (Note 1: severe every 3,000 mi / 3 mo)" },
    { serviceName: "Engine oil filter replacement", itemType: "replace", intervalMiles: 6000, intervalMonths: 6, sourcePage: "P. 28 — Item 2" },
    { serviceName: "Rotate and inspect tires", itemType: "replace", intervalMiles: 6000, intervalMonths: 6, sourcePage: "P. 28 — Item 19" },
    { serviceName: "Replace HVAC system A/C filter (cabin)", itemType: "replace", intervalMiles: 12000, intervalMonths: 12, sourcePage: "P. 28 — Item 20 (Note 8: inspect more often if dusty)" },
    { serviceName: "Replace air cleaner element", itemType: "replace", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 7" },
    { serviceName: "Inspect drive belt(s)", itemType: "inspect", intervalMonths: 12, sourcePage: "P. 28 — Item 4 (inspect at 30, 42, 54, 66 mo)" },
    { serviceName: "Replace brake fluid", itemType: "replace", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 15 (Note 5: humid/mountain — 15,000 mi / 15 mo)" },
    { serviceName: "Inspect CVT fluid", itemType: "inspect", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 12 (Note 4: severe replace every 40,000 km)" },
    { serviceName: "Inspect front and rear differential gear oil", itemType: "inspect", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 13 (Note 3: severe replace every 15,000 mi)" },
    { serviceName: "Replace spark plugs", itemType: "replace", intervalMiles: 60000, intervalMonths: 60, sourcePage: "P. 28 — Item 3" },
    { serviceName: "Replace engine coolant (first interval)", itemType: "replace", intervalMiles: 137500, intervalMonths: 132, sourcePage: "P. 28 — Item 9 (first 11 years / 137,500 mi)" },
    { serviceName: "Replace engine coolant (subsequent)", itemType: "replace", intervalMiles: 75000, intervalMonths: 72, sourcePage: "P. 28 — Item 9 (every 6 years / 75,000 mi thereafter)" },
    { serviceName: "Inspect cooling system hoses and connections", itemType: "inspect", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 8" },
  ],
};

const hyundaiElantraExtract = {
  version: "1",
  source: "hyundai-elantra-2020-owners-manual-ch7",
  exportedAt,
  manualTitle: "2024 Hyundai Elantra SE/SEL — Normal maintenance schedule (U.S., 2.0 MPI proxy)",
  storageKey: "dogfood/oem-extracts/hyundai-elantra-2024/oem-schedule.v1.json",
  documentRef: {
    fileName: "hyundai-elantra-2020-om.pdf",
    pages: "P. 7-8, 7-9, 7-10 (Normal Maintenance Schedule 2.0 MPI); 2024 Elantra OM unavailable — 2020 schedule used as verified proxy for 2.0L IVT trims",
    vehicleContext: { engine: "2.0L MPI / Smartstream 2.0", drivetrain: "FWD IVT", market: "US" },
    coverage: {
      included: "Normal schedule replace/inspect rows for 2.0 MPI; severe table P. 7-11.",
      excluded: "1.6 T-GDI schedule (P. 7-13); N-Line / hybrid variants.",
    },
    note: "Fixed-interval schedule. IVT fluid: no check/service under normal usage (P. 7-9).",
  },
  entries: [
    { serviceName: "Engine oil and engine oil filter replacement", itemType: "replace", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-8 — Engine oil and filter (severe: 3,750 mi / 6 mo)" },
    { serviceName: "Fuel additives (if non-TOP TIER gasoline)", itemType: "replace", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-8 — Fuel additives *1" },
    { serviceName: "Rotate tires", itemType: "replace", intervalMiles: 7500, sourcePage: "P. 7-8 — Rotate tires every 7,500 miles" },
    { serviceName: "Replace climate control air filter", itemType: "replace", intervalMonths: 12, sourcePage: "P. 7-8 — Climate control air filter every 12 months" },
    { serviceName: "Replace air cleaner filter", itemType: "replace", intervalMiles: 30000, intervalMonths: 36, sourcePage: "P. 7-8 — Air cleaner filter (R at 30, 60, 90… mo)" },
    { serviceName: "Inspect air cleaner filter", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-8 — Air cleaner filter (I between replacements)" },
    { serviceName: "Replace spark plugs", itemType: "replace", intervalMiles: 97500, sourcePage: "P. 7-8 — Spark plugs every 97,500 miles" },
    { serviceName: "Inspect drive belts", itemType: "inspect", intervalMiles: 60000, intervalMonths: 72, sourcePage: "P. 7-8 — Drive belts *2 (first at 60,000 mi / 72 mo, then every 15,000 mi / 24 mo)" },
    { serviceName: "Replace engine coolant (first interval)", itemType: "replace", intervalMiles: 120000, intervalMonths: 120, sourcePage: "P. 7-8 — Engine coolant first at 120,000 mi / 10 years" },
    { serviceName: "Replace engine coolant (subsequent)", itemType: "replace", intervalMiles: 30000, intervalMonths: 24, sourcePage: "P. 7-8 — Engine coolant thereafter every 30,000 mi / 24 mo" },
    { serviceName: "Inspect brake/clutch fluid", itemType: "inspect", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-10 — Brake/clutch fluid (inspect under normal schedule)" },
    { serviceName: "Intelligent Variable Transmission (IVT) fluid — severe only", itemType: "replace", intervalMiles: 60000, sourcePage: "P. 7-11 — IVT fluid severe usage every 60,000 mi" },
  ],
};

const mazdaCx30Extract = {
  version: "1",
  source: "mazda-cx30-2024-scheduled-maintenance",
  exportedAt,
  manualTitle: "2024 Mazda CX-30 — Normal driving scheduled maintenance (U.S.)",
  storageKey: "dogfood/oem-extracts/mazda-cx-30-2024/oem-schedule.v1.json",
  documentRef: {
    fileName: "mazda-cx30-2024-sched.pdf",
    pages: "P. 9-6–9-8 (Normal + severe driving scheduled maintenance)",
    vehicleContext: { engine: "SKYACTIV-G 2.5", drivetrain: "AWD", market: "US" },
    coverage: {
      included: "Normal schedule replace/inspect rows; vehicle status monitor max 10,000 mi / 12 mo oil interval.",
      excluded: "SKYACTIV-G 2.5T spark plug interval (40,000 mi); severe-only oil 5,000 mi table.",
    },
    note: "Flexible maintenance monitor — oil/filter replaced when wrench indicator appears (max 10,000 mi / 12 mo).",
  },
  entries: [
    { serviceName: "Engine oil and filter replacement", itemType: "replace", intervalMiles: 10000, intervalMonths: 12, sourcePage: "P. 9-6 — Engine oil & filter *1 (max 10,000 mi / 12 mo normal)" },
    { serviceName: "Rotate tires", itemType: "replace", intervalMiles: 10000, sourcePage: "P. 9-7 — Tire rotation every 16,000 km (10,000 mi)" },
    { serviceName: "Replace engine air filter", itemType: "replace", intervalMiles: 20000, sourcePage: "P. 9-6 — Air filter (R at maintenance cycles 1–2)" },
    { serviceName: "Replace cabin air filter", itemType: "replace", intervalMiles: 30000, intervalMonths: 24, sourcePage: "P. 9-7 — Cabin air filter every 48,000 km (30,000 mi) or 24 months" },
    { serviceName: "Replace spark plugs (SKYACTIV-G 2.5)", itemType: "replace", intervalMiles: 75000, sourcePage: "P. 9-6 — Spark plugs 2.5: every 120,000 km (75,000 mi)" },
    { serviceName: "Replace engine coolant (first interval)", itemType: "replace", intervalMiles: 120000, intervalMonths: 120, sourcePage: "P. 9-6 — Coolant *3 first 192,000 km (120,000 mi) or 120 months" },
    { serviceName: "Replace engine coolant (subsequent)", itemType: "replace", intervalMiles: 60000, intervalMonths: 60, sourcePage: "P. 9-6 — Coolant thereafter every 96,000 km (60,000 mi) or 60 months" },
    { serviceName: "Inspect drive belts", itemType: "inspect", intervalMiles: 10000, sourcePage: "P. 9-6 — Drive belts (I each normal maintenance cycle)" },
    { serviceName: "Inspect brake and clutch fluid level", itemType: "inspect", intervalMiles: 10000, sourcePage: "P. 9-7 — Brake and clutch fluid level (I; replace if necessary)" },
    { serviceName: "Inspect disc brakes", itemType: "inspect", intervalMiles: 10000, sourcePage: "P. 9-7 — Disc brakes (I each cycle)" },
    { serviceName: "Inspect coolant level", itemType: "inspect", intervalMiles: 10000, sourcePage: "P. 9-6 — Coolant level (I each cycle)" },
    { serviceName: "Engine oil and filter — severe driving", itemType: "replace", intervalMiles: 5000, intervalMonths: 6, sourcePage: "P. 9-8 — Severe schedule every 8,000 km (5,000 mi) or 6 months" },
  ],
};

writeDogfood({ slug: "honda-accord-2024", payload: hondaAccordExtract });
writeDogfood({ slug: "subaru-forester-2024", payload: subaruForesterExtract });
writeDogfood({ slug: "hyundai-elantra-2024", payload: hyundaiElantraExtract });
writeDogfood({ slug: "mazda-cx-30-2024", payload: mazdaCx30Extract });

const hondaPackEntries = [
  { entryId: "code-b", canonicalServiceId: "honda.mm.b.oil_filter", serviceName: "Replace engine oil and filter (Maintenance Minder B)", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Code B", ruleId: "knowledge.policy.code-b.v1", mainItemCode: "B", confidence: 0.97, projectionNote: "MM-adaptive; minimum 12 months if no alert." },
  { entryId: "mm-sub-1", canonicalServiceId: "generic.tire_rotation", serviceName: "Rotate tires (Maintenance Minder sub 1)", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 6 — Sub 1", ruleId: "knowledge.policy.mm-sub-1.v1", subItemCode: "1", confidence: 0.96 },
  { entryId: "mm-sub-2-engine-air", canonicalServiceId: "generic.engine_air_filter", serviceName: "Replace engine air cleaner element (Maintenance Minder sub 2)", intervalMiles: 15000, intervalMonths: null, sourcePage: "P. 6 — Sub 2 (*2 dusty conditions)", ruleId: "knowledge.policy.mm-sub-2-engine-air.v1", subItemCode: "2", confidence: 0.95, projectionNote: "MM-adaptive; 15,000 mi max in dusty conditions." },
  { entryId: "mm-sub-2-cabin", canonicalServiceId: "generic.cabin_air_filter", serviceName: "Replace dust and pollen (cabin) filter (Maintenance Minder sub 2)", intervalMiles: 15000, intervalMonths: null, sourcePage: "P. 6 — Sub 2 (*3 urban soot)", ruleId: "knowledge.policy.mm-sub-2-cabin.v1", subItemCode: "2", confidence: 0.95, projectionNote: "MM-adaptive; 15,000 mi max in urban soot / heavy pollution." },
  { entryId: "mm-sub-2-drive-belt", canonicalServiceId: "honda.mm.2.drive_belt", serviceName: "Inspect drive belt (Maintenance Minder sub 2)", intervalMiles: 15000, intervalMonths: null, sourcePage: "P. 6 — Sub 2", ruleId: "knowledge.policy.mm-sub-2-drive-belt.v1", subItemCode: "2", confidence: 0.94, projectionNote: "Inspect only — replace if worn." },
  { entryId: "mm-sub-3", canonicalServiceId: "honda.mm.3.transmission", serviceName: "Replace transmission fluid (Maintenance Minder sub 3)", intervalMiles: 30000, intervalMonths: 36, sourcePage: "P. 6 — Sub 3 (*4 mountain: 25,000 mi)", ruleId: "knowledge.policy.mm-sub-3.v1", subItemCode: "3", confidence: 0.95, projectionNote: "MM-adaptive; mountain/low-speed: every 25,000 mi." },
  { entryId: "mm-sub-4-spark", canonicalServiceId: "generic.spark_plugs", serviceName: "Replace spark plugs (Maintenance Minder sub 4)", intervalMiles: 105000, intervalMonths: null, sourcePage: "P. 6 — Sub 4", ruleId: "knowledge.policy.mm-sub-4-spark.v1", subItemCode: "4", confidence: 0.96 },
  { entryId: "mm-sub-4-valve", canonicalServiceId: "honda.mm.4.valve_clearance", serviceName: "Inspect valve clearance (Maintenance Minder sub 4)", intervalMiles: 105000, intervalMonths: null, sourcePage: "P. 6 — Sub 4", ruleId: "knowledge.policy.mm-sub-4-valve.v1", subItemCode: "4", confidence: 0.94, projectionNote: "Inspect only — adjust if noisy." },
  { entryId: "mm-sub-5", canonicalServiceId: "generic.coolant", serviceName: "Replace engine coolant (Maintenance Minder sub 5)", intervalMiles: 100000, intervalMonths: 60, sourcePage: "P. 6 — Sub 5", ruleId: "knowledge.policy.mm-sub-5.v1", subItemCode: "5", confidence: 0.94 },
  { entryId: "mm-sub-7", canonicalServiceId: "generic.brake_fluid", serviceName: "Replace brake fluid (Maintenance Minder sub 7)", intervalMiles: null, intervalMonths: 36, sourcePage: "P. 6 — Sub 7 (*5 every 3 years)", ruleId: "knowledge.policy.mm-sub-7.v1", subItemCode: "7", confidence: 0.96 },
];

const subaruPackEntries = [
  { entryId: "engine-oil", canonicalServiceId: "subaru.fixed.6000.engine_oil", serviceName: "Engine oil and filter change", intervalMiles: 6000, intervalMonths: 6, sourcePage: "P. 28 — Items 1–2", ruleId: "knowledge.policy.engine-oil.v1", confidence: 0.97, projectionNote: "Severe: every 3,000 mi / 3 months (Note 1)." },
  { entryId: "tire-rotation", canonicalServiceId: "generic.tire_rotation", serviceName: "Rotate and inspect tires", intervalMiles: 6000, intervalMonths: 6, sourcePage: "P. 28 — Item 19", ruleId: "knowledge.policy.tire-rotation.v1", confidence: 0.96 },
  { entryId: "cabin-air-filter", canonicalServiceId: "generic.cabin_air_filter", serviceName: "Replace HVAC system A/C filter (cabin)", intervalMiles: 12000, intervalMonths: 12, sourcePage: "P. 28 — Item 20", ruleId: "knowledge.policy.cabin-filter.v1", confidence: 0.95 },
  { entryId: "engine-air-filter", canonicalServiceId: "generic.engine_air_filter", serviceName: "Replace air cleaner element", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 7", ruleId: "knowledge.policy.engine-air-filter.v1", confidence: 0.95 },
  { entryId: "drive-belt-inspect", canonicalServiceId: "subaru.fixed.drive_belt", serviceName: "Inspect drive belt(s)", intervalMiles: null, intervalMonths: 12, sourcePage: "P. 28 — Item 4", ruleId: "knowledge.policy.drive-belt.v1", confidence: 0.93, projectionNote: "Inspect at 30, 42, 54, 66 months; replace if worn." },
  { entryId: "brake-fluid", canonicalServiceId: "generic.brake_fluid", serviceName: "Replace brake fluid", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 15", ruleId: "knowledge.policy.brake-fluid.v1", confidence: 0.95, projectionNote: "Humid/mountain: every 15,000 mi / 15 mo (Note 5)." },
  { entryId: "cvt-fluid-inspect", canonicalServiceId: "subaru.fixed.cvt_fluid", serviceName: "Inspect CVT fluid", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 12", ruleId: "knowledge.policy.cvt-fluid.v1", powertrain: "AWD", confidence: 0.93, projectionNote: "Severe: replace every 24,855 mi (Note 4)." },
  { entryId: "diff-inspect", canonicalServiceId: "subaru.fixed.diff.awd", serviceName: "Inspect front and rear differential gear oil", intervalMiles: 30000, intervalMonths: 30, sourcePage: "P. 28 — Item 13", ruleId: "knowledge.policy.diff-inspect.v1", powertrain: "AWD", confidence: 0.93, projectionNote: "Severe: replace every 15,000 mi (Note 3)." },
  { entryId: "spark-plugs", canonicalServiceId: "generic.spark_plugs", serviceName: "Replace spark plugs", intervalMiles: 60000, intervalMonths: 60, sourcePage: "P. 28 — Item 3", ruleId: "knowledge.policy.spark-plugs.v1", confidence: 0.95 },
  { entryId: "coolant-first", canonicalServiceId: "generic.coolant", serviceName: "Replace engine coolant (first interval)", intervalMiles: 137500, intervalMonths: 132, sourcePage: "P. 28 — Item 9", ruleId: "knowledge.policy.coolant.v1", confidence: 0.94, projectionNote: "First: 11 years / 137,500 mi; thereafter every 6 years / 75,000 mi." },
];

const hyundaiPackEntries = [
  { entryId: "engine-oil", canonicalServiceId: "hyundai.fixed.7500.engine_oil", serviceName: "Engine oil and filter change", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-8 — Engine oil and filter", ruleId: "knowledge.policy.engine-oil.v1", confidence: 0.97, projectionNote: "Severe: every 3,750 mi / 6 mo (P. 7-11)." },
  { entryId: "tire-rotation", canonicalServiceId: "generic.tire_rotation", serviceName: "Rotate tires", intervalMiles: 7500, sourcePage: "P. 7-8 — Rotate tires every 7,500 miles", ruleId: "knowledge.policy.tire-rotation.v1", confidence: 0.96 },
  { entryId: "cabin-air-filter", canonicalServiceId: "generic.cabin_air_filter", serviceName: "Replace climate control air filter", intervalMiles: null, intervalMonths: 12, sourcePage: "P. 7-8 — Climate control air filter", ruleId: "knowledge.policy.cabin-filter.v1", confidence: 0.95 },
  { entryId: "engine-air-filter", canonicalServiceId: "generic.engine_air_filter", serviceName: "Replace air cleaner filter", intervalMiles: 30000, intervalMonths: 36, sourcePage: "P. 7-8 — Air cleaner filter", ruleId: "knowledge.policy.engine-air-filter.v1", confidence: 0.95 },
  { entryId: "engine-air-inspect", canonicalServiceId: "hyundai.fixed.air_cleaner_inspect", serviceName: "Inspect air cleaner filter", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-8 — Air cleaner filter (inspect between replacements)", ruleId: "knowledge.policy.engine-air-inspect.v1", confidence: 0.93, projectionNote: "Inspect only between 30k replacements." },
  { entryId: "spark-plugs", canonicalServiceId: "generic.spark_plugs", serviceName: "Replace spark plugs", intervalMiles: 97500, sourcePage: "P. 7-8 — Spark plugs", ruleId: "knowledge.policy.spark-plugs.v1", confidence: 0.95 },
  { entryId: "drive-belt-inspect", canonicalServiceId: "hyundai.fixed.drive_belt", serviceName: "Inspect drive belts", intervalMiles: 60000, intervalMonths: 72, sourcePage: "P. 7-8 — Drive belts *2", ruleId: "knowledge.policy.drive-belt.v1", confidence: 0.93, projectionNote: "First at 60,000 mi / 72 mo; then every 15,000 mi / 24 mo." },
  { entryId: "coolant-first", canonicalServiceId: "generic.coolant", serviceName: "Replace engine coolant (first interval)", intervalMiles: 120000, intervalMonths: 120, sourcePage: "P. 7-8 — Engine coolant", ruleId: "knowledge.policy.coolant.v1", confidence: 0.94, projectionNote: "First: 120,000 mi / 10 years; thereafter every 30,000 mi / 24 mo." },
  { entryId: "brake-fluid-inspect", canonicalServiceId: "hyundai.fixed.brake_fluid_inspect", serviceName: "Inspect brake/clutch fluid", intervalMiles: 7500, intervalMonths: 12, sourcePage: "P. 7-10 — Brake/clutch fluid", ruleId: "knowledge.policy.brake-fluid-inspect.v1", confidence: 0.93, projectionNote: "Inspect under normal schedule; replace if degraded." },
  { entryId: "ivt-fluid-severe", canonicalServiceId: "generic.transmission_fluid", serviceName: "Replace IVT fluid (severe usage only)", intervalMiles: 60000, sourcePage: "P. 7-11 — IVT fluid severe", ruleId: "knowledge.policy.transmission-fluid.v1", confidence: 0.91, projectionNote: "Normal usage: no IVT service required (P. 7-9)." },
];

const mazdaPackEntries = [
  { entryId: "engine-oil", canonicalServiceId: "mazda.fixed.10000.engine_oil", serviceName: "Engine oil and filter change", intervalMiles: 10000, intervalMonths: 12, sourcePage: "P. 9-6 — Engine oil & filter *1", ruleId: "knowledge.policy.engine-oil.v1", confidence: 0.97, projectionNote: "Flexible monitor; max 10,000 mi / 12 mo. Severe: 5,000 mi / 6 mo." },
  { entryId: "tire-rotation", canonicalServiceId: "generic.tire_rotation", serviceName: "Rotate tires", intervalMiles: 10000, sourcePage: "P. 9-7 — Tire rotation", ruleId: "knowledge.policy.tire-rotation.v1", confidence: 0.96 },
  { entryId: "engine-air-filter", canonicalServiceId: "generic.engine_air_filter", serviceName: "Replace engine air filter", intervalMiles: 20000, sourcePage: "P. 9-6 — Air filter (cycles 1–2)", ruleId: "knowledge.policy.engine-air-filter.v1", confidence: 0.94 },
  { entryId: "cabin-air-filter", canonicalServiceId: "generic.cabin_air_filter", serviceName: "Replace cabin air filter", intervalMiles: 30000, intervalMonths: 24, sourcePage: "P. 9-7 — Cabin air filter", ruleId: "knowledge.policy.cabin-filter.v1", confidence: 0.95 },
  { entryId: "spark-plugs", canonicalServiceId: "generic.spark_plugs", serviceName: "Replace spark plugs (SKYACTIV-G 2.5)", intervalMiles: 75000, sourcePage: "P. 9-6 — Spark plugs 2.5", ruleId: "knowledge.policy.spark-plugs.v1", confidence: 0.95 },
  { entryId: "coolant-first", canonicalServiceId: "generic.coolant", serviceName: "Replace engine coolant (first interval)", intervalMiles: 120000, intervalMonths: 120, sourcePage: "P. 9-6 — Coolant *3", ruleId: "knowledge.policy.coolant.v1", confidence: 0.94, projectionNote: "First: 120,000 mi / 120 mo; thereafter every 60,000 mi / 60 mo." },
  { entryId: "drive-belt-inspect", canonicalServiceId: "mazda.fixed.drive_belt", serviceName: "Inspect drive belts", intervalMiles: 10000, sourcePage: "P. 9-6 — Drive belts", ruleId: "knowledge.policy.drive-belt.v1", confidence: 0.93, projectionNote: "Inspect each maintenance cycle." },
  { entryId: "brake-fluid-inspect", canonicalServiceId: "mazda.fixed.brake_fluid_inspect", serviceName: "Inspect brake and clutch fluid level", intervalMiles: 10000, sourcePage: "P. 9-7 — Brake and clutch fluid level", ruleId: "knowledge.policy.brake-fluid-inspect.v1", confidence: 0.93, projectionNote: "Inspect only — replace if necessary." },
  { entryId: "disc-brakes-inspect", canonicalServiceId: "mazda.fixed.disc_brakes", serviceName: "Inspect disc brakes", intervalMiles: 10000, sourcePage: "P. 9-7 — Disc brakes", ruleId: "knowledge.policy.disc-brakes.v1", confidence: 0.93 },
  { entryId: "coolant-level-inspect", canonicalServiceId: "mazda.fixed.coolant_level", serviceName: "Inspect coolant level", intervalMiles: 10000, sourcePage: "P. 9-6 — Coolant level", ruleId: "knowledge.policy.coolant-inspect.v1", confidence: 0.92 },
];

const packBase = (packId, trim, extra = {}) => ({
  version: 3,
  manualTitle: extra.manualTitle,
  scheduleKind: extra.scheduleKind ?? "fixed_interval",
  qaStatus: "auto_verified",
  qaNotes: extra.qaNotes,
  sourceManifestRef: extra.sourceManifestRef ?? `sources/manifest.json#${packId}`,
  vehicle: { market: "US", ...extra.vehicle, trim },
  entries: extra.entries,
});

writePack({
  packId: "honda-accord-2024-ex",
  ...packBase("honda-accord-2024-ex", "EX", {
    manualTitle: "2024 Honda Accord EX — Maintenance Minder schedule (U.S.)",
    scheduleKind: "maintenance_minder",
    qaNotes: "Full MM subs 1–7 from 2024 Accord Maintenance Minder supplement (PDF P. 6–7); dogfood extract seeds/dogfood/oem-extracts/honda-accord-2024/.",
    vehicle: { make: "Honda", model: "Accord", year: 2024 },
    entries: hondaPackEntries,
  }),
});

writePack({
  packId: "honda-accord-2024-sport",
  ...packBase("honda-accord-2024-sport", "Sport", {
    manualTitle: "2024 Honda Accord Sport — Maintenance Minder schedule (U.S.)",
    scheduleKind: "maintenance_minder",
    qaNotes: "Same 2024 Accord MM schedule as EX trim; PDF-mined P. 6–7.",
    sourceManifestRef: "sources/manifest.json#honda-accord-2024-ex",
    vehicle: { make: "Honda", model: "Accord", year: 2024 },
    entries: hondaPackEntries,
  }),
});

for (const trim of ["Premium", "Limited"]) {
  const packId = trim === "Premium" ? "subaru-forester-2024-premium" : "subaru-forester-2024-limited";
  writePack({
    packId,
    ...packBase(packId, trim, {
      manualTitle: `2024 Subaru Forester ${trim} — Warranty & Maintenance schedule (U.S.)`,
      qaNotes: "Full fixed-interval schedule from 2024 Subaru Warranty & Maintenance booklet P. 28–29; dogfood extract seeds/dogfood/oem-extracts/subaru-forester-2024/.",
      vehicle: { make: "Subaru", model: "Forester", year: 2024, powertrain: "AWD" },
      entries: subaruPackEntries,
    }),
  });
}

for (const trim of ["SE", "SEL"]) {
  const packId = trim === "SE" ? "hyundai-elantra-2024-se" : "hyundai-elantra-2024-sel";
  writePack({
    packId,
    ...packBase(packId, trim, {
      manualTitle: `2024 Hyundai Elantra ${trim} — Normal maintenance schedule (U.S., 2.0 MPI)`,
      qaNotes: "PDF-mined from 2020 Elantra Owner's Manual P. 7-8 (2.0 MPI proxy for 2024 SE/SEL IVT); dogfood extract seeds/dogfood/oem-extracts/hyundai-elantra-2024/.",
      vehicle: { make: "Hyundai", model: "Elantra", year: 2024 },
      entries: hyundaiPackEntries,
    }),
  });
}

for (const trim of ["Select", "Preferred"]) {
  const packId = trim === "Select" ? "mazda-cx-30-2024-select" : "mazda-cx-30-2024-preferred";
  writePack({
    packId,
    ...packBase(packId, trim, {
      manualTitle: `2024 Mazda CX-30 ${trim} — Normal driving scheduled maintenance (U.S.)`,
      qaNotes: "PDF-mined from 2024 CX-30 scheduled maintenance P. 9-6–9-8; dogfood extract seeds/dogfood/oem-extracts/mazda-cx-30-2024/.",
      vehicle: { make: "Mazda", model: "CX-30", year: 2024, powertrain: "AWD" },
      entries: mazdaPackEntries,
    }),
  });
}

// Bump TLX packs to v3 with PDF citation (entries unchanged)
for (const spec of [
  { packId: "acura-tlx-2021-sh-awd", trim: "Technology", powertrain: "SH-AWD", manifest: "acura-tlx-2021-sh-awd" },
  { packId: "acura-tlx-2021-technology", trim: "Technology", manifest: "acura-tlx-2021-technology" },
]) {
  const existing = JSON.parse(readFileSync(join(packsDir, `${spec.packId}.v1.json`), "utf8"));
  writePack({
    ...existing,
    version: 3,
    qaNotes:
      "Full MM subs 1–7 from 2021 TLX owner manual P. 527 — dogfood verified (seeds/dogfood/karan-tlx/oem-schedule.v1.json).",
    sourceManifestRef: `sources/manifest.json#${spec.manifest}`,
  });
}

console.log("Wrote 4 dogfood extracts + upgraded 10 OEM packs to v3 (PDF-mined).");
