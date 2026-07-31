#!/usr/bin/env node
/**
 * Interview demo fleet: 6 models, canonical full OEM packs, minimal catalog.
 * Run from repo root: node packages/knowledge/scripts/build-interview-fleet.mjs
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const knowledgeRoot = join(scriptDir, "..");
const packsDir = join(knowledgeRoot, "packs");
const catalogPath = join(knowledgeRoot, "catalog/supported-vehicles.v1.json");
const fixturesDir = join(knowledgeRoot, "fixtures/matching");

/** Canonical pack files retained on disk (all other pack JSON files are removed). */
export const INTERVIEW_PACK_IDS = [
  "acura-tlx-2021-sh-awd",
  "acura-tlx-2021-technology",
  "honda-accord-2024-ex",
  "honda-accord-2024-sport",
  "subaru-forester-2024-premium",
  "subaru-forester-2024-limited",
  "hyundai-elantra-2024-se",
  "hyundai-elantra-2024-sel",
  "hyundai-elantra-2022-sel",
  "mazda-cx-30-2024-select",
  "mazda-cx-30-2024-preferred",
];

const FLEET = [
  {
    make: "Acura",
    model: "TLX",
    years: [2021, 2022, 2023, 2024, 2025, 2026],
    trims: [
      { trim: "Technology", packId: "acura-tlx-2021-technology", supportTier: "tier1" },
      { trim: "Technology", packId: "acura-tlx-2021-sh-awd", powertrain: "SH-AWD", supportTier: "tier1" },
    ],
  },
  {
    make: "Honda",
    model: "Accord",
    years: [2025, 2026],
    trims: [
      { trim: "EX", packId: "honda-accord-2024-ex", supportTier: "tier1" },
      { trim: "Sport", packId: "honda-accord-2024-sport", supportTier: "tier1" },
    ],
  },
  {
    make: "Subaru",
    model: "Forester",
    years: [2025, 2026],
    trims: [
      { trim: "Premium", packId: "subaru-forester-2024-premium", powertrain: "AWD", supportTier: "tier1" },
      { trim: "Limited", packId: "subaru-forester-2024-limited", powertrain: "AWD", supportTier: "tier1" },
    ],
  },
  {
    make: "Hyundai",
    model: "Elantra",
    years: [2022],
    trims: [{ trim: "SEL", packId: "hyundai-elantra-2022-sel", supportTier: "tier1" }],
  },
  {
    make: "Hyundai",
    model: "Elantra",
    years: [2025, 2026],
    trims: [
      { trim: "SE", packId: "hyundai-elantra-2024-se", supportTier: "tier1" },
      { trim: "SEL", packId: "hyundai-elantra-2024-sel", supportTier: "tier1" },
    ],
  },
  {
    make: "Mazda",
    model: "CX-30",
    years: [2025, 2026],
    trims: [
      { trim: "Select", packId: "mazda-cx-30-2024-select", powertrain: "AWD", supportTier: "tier1" },
      { trim: "Preferred", packId: "mazda-cx-30-2024-preferred", powertrain: "AWD", supportTier: "tier1" },
    ],
  },
];

const buildCatalog = () => {
  const vehicles = [];
  for (const model of FLEET) {
    for (const year of model.years) {
      for (const trimRow of model.trims) {
        vehicles.push({
          packId: trimRow.packId,
          make: model.make,
          model: model.model,
          year,
          trim: trimRow.trim,
          ...(trimRow.powertrain ? { powertrain: trimRow.powertrain } : {}),
          qaStatus: "auto_verified",
          supportTier: trimRow.supportTier,
          scheduleDepth: "verified",
        });
      }
    }
  }
  return { version: 2, vehicles };
};

const clonePackTrim = (sourcePackId, targetPackId, trim, manualSuffix) => {
  const sourcePath = join(packsDir, `${sourcePackId}.v1.json`);
  const pack = JSON.parse(readFileSync(sourcePath, "utf8"));
  pack.packId = targetPackId;
  pack.version = 2;
  pack.manualTitle = pack.manualTitle.replace(/\b(EX|Premium|SE|Select)\b/, trim);
  pack.vehicle.trim = trim;
  pack.qaNotes = `${pack.qaNotes ?? ""} Interview fleet sibling trim (${manualSuffix}).`.trim();
  writeFileSync(join(packsDir, `${targetPackId}.v1.json`), `${JSON.stringify(pack, null, 2)}\n`);
};

const prunePacks = () => {
  const keep = new Set(INTERVIEW_PACK_IDS.map((id) => `${id}.v1.json`));
  let removed = 0;
  for (const file of readdirSync(packsDir)) {
    if (!file.endsWith(".json") || keep.has(file)) continue;
    rmSync(join(packsDir, file));
    removed += 1;
  }
  return removed;
};

const pruneFixtures = () => {
  const keep = new Set(
    INTERVIEW_PACK_IDS.map((id) => `${id.replace(/\//g, "-")}.json`).map((name) =>
      name.includes("acura-tlx") ? name : name,
    ),
  );
  const fixtureNames = {
    "acura-tlx-2021-sh-awd": "acura-tlx-2021-sh-awd.json",
    "acura-tlx-2021-technology": "acura-tlx-2021-technology.json",
    "honda-accord-2024-ex": "honda-accord-2024-ex.json",
    "honda-accord-2024-sport": "honda-accord-2024-sport.json",
    "subaru-forester-2024-premium": "subaru-forester-2024-premium.json",
    "subaru-forester-2024-limited": "subaru-forester-2024-limited.json",
    "hyundai-elantra-2024-se": "hyundai-elantra-2024-se.json",
    "hyundai-elantra-2024-sel": "hyundai-elantra-2024-sel.json",
    "hyundai-elantra-2022-sel": "hyundai-elantra-2022-sel.json",
    "mazda-cx-30-2024-select": "mazda-cx-30-2024-select.json",
    "mazda-cx-30-2024-preferred": "mazda-cx-30-2024-preferred.json",
  };
  Object.values(fixtureNames).forEach((f) => keep.add(f));

  let removed = 0;
  for (const file of readdirSync(fixturesDir)) {
    if (!file.endsWith(".json") || keep.has(file)) continue;
    rmSync(join(fixturesDir, file));
    removed += 1;
  }
  return removed;
};

const catalog = buildCatalog();
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

// Sibling trim packs cloned after primary packs are written.
try {
  clonePackTrim("honda-accord-2024-ex", "honda-accord-2024-sport", "Sport", "Accord");
} catch {
  /* primary pack written separately */
}
try {
  clonePackTrim("subaru-forester-2024-premium", "subaru-forester-2024-limited", "Limited", "Forester");
} catch {
  /* primary pack written separately */
}
try {
  clonePackTrim("hyundai-elantra-2024-se", "hyundai-elantra-2024-sel", "SEL", "Elantra");
} catch {
  /* primary pack written separately */
}
try {
  clonePackTrim("mazda-cx-30-2024-select", "mazda-cx-30-2024-preferred", "Preferred", "CX-30");
} catch {
  /* primary pack written separately */
}

const removedPacks = prunePacks();
const removedFixtures = pruneFixtures();

console.log(`Interview fleet catalog: ${catalog.vehicles.length} rows`);
console.log(`Removed ${removedPacks} pack files, ${removedFixtures} matching fixtures`);
console.log(`Kept packs: ${INTERVIEW_PACK_IDS.length}`);
