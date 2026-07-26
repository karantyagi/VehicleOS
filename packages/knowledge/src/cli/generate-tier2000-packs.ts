import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { TIER1_PACK_SPECS } from "../factory/tier1-manifest.js";
import { generateTier2000Pack } from "../factory/generate-pack.js";
import {
  loadTier2000PackTargets,
  loadTier2000SourceByPackId,
} from "../factory/load-tier2000-registry.js";
import { runPackQaRules, validateOemSchedulePack } from "../validate-pack.js";
import type { OemSchedulePack, SupportedVehicleCatalog } from "../types.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packsDir = join(packageRoot, "packs");
const catalogPath = join(packageRoot, "catalog", "supported-vehicles.v1.json");

const skipExisting = process.argv.includes("--skip-existing");
const tier1PackIds = new Set(TIER1_PACK_SPECS.map((spec) => spec.packId));

const loadExistingCatalog = (): SupportedVehicleCatalog => {
  if (!existsSync(catalogPath)) {
    return { version: 1, vehicles: [] };
  }
  return JSON.parse(readFileSync(catalogPath, "utf8")) as SupportedVehicleCatalog;
};

const loadExistingPack = (packId: string): OemSchedulePack | null => {
  const packPath = join(packsDir, `${packId}.v1.json`);
  if (!existsSync(packPath)) return null;
  return validateOemSchedulePack(JSON.parse(readFileSync(packPath, "utf8")) as unknown);
};

const writeCatalog = (catalog: SupportedVehicleCatalog) => {
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
};

const main = () => {
  const targets = loadTier2000PackTargets();
  const sourcesByPackId = loadTier2000SourceByPackId();
  const existingCatalog = loadExistingCatalog();
  const catalogByPackId = new Map(
    existingCatalog.vehicles
      .filter((row) => tier1PackIds.has(row.packId) || row.supportTier === "tier1")
      .map((row) => [row.packId, row]),
  );

  let generated = 0;
  let preserved = 0;
  let skipped = 0;
  let deduped = 0;
  const issues: string[] = [];
  const seenPackIds = new Set<string>();

  for (const spec of targets) {
    if (seenPackIds.has(spec.packId)) {
      deduped += 1;
      continue;
    }
    seenPackIds.add(spec.packId);
    const packPath = join(packsDir, `${spec.packId}.v1.json`);
    const sourceRow = sourcesByPackId.get(spec.packId);
    const existingPack = loadExistingPack(spec.packId);
    const existingCatalogRow = catalogByPackId.get(spec.packId);

    if (skipExisting && existsSync(packPath)) {
      skipped += 1;
      continue;
    }

    const isTier1Pack = tier1PackIds.has(spec.packId);
    const preserveAutoVerified =
      isTier1Pack &&
      (existingPack?.qaStatus === "auto_verified" ||
        existingCatalogRow?.qaStatus === "auto_verified");

    let pack: OemSchedulePack;
    if (preserveAutoVerified && existingPack) {
      pack = existingPack;
      preserved += 1;
    } else {
      pack = generateTier2000Pack(spec, {
        qaStatus: preserveAutoVerified ? "auto_verified" : undefined,
      });
      validateOemSchedulePack(pack);
      const qaIssues = runPackQaRules(pack);
      if (pack.qaStatus === "auto_verified" && qaIssues.length > 0) {
        issues.push(`${spec.packId}: ${qaIssues.join("; ")}`);
      }
      writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
      generated += 1;
    }

    const supportTier = tier1PackIds.has(spec.packId)
      ? "tier1"
      : existingCatalogRow?.supportTier === "tier1"
        ? "tier1"
        : "tier2";

    catalogByPackId.set(spec.packId, {
      packId: spec.packId,
      make: spec.make,
      model: spec.model,
      year: spec.year,
      trim: spec.trim,
      powertrain: spec.powertrain,
      qaStatus: preserveAutoVerified ? "auto_verified" : pack.qaStatus,
      supportTier,
    });
  }

  writeCatalog({
    version: 1,
    vehicles: [...catalogByPackId.values()].sort((a, b) => {
      const priorityA = targets.findIndex((row) => row.packId === a.packId);
      const priorityB = targets.findIndex((row) => row.packId === b.packId);
      const rankA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA;
      const rankB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB;
      if (rankA !== rankB) return rankA - rankB;
      return a.packId.localeCompare(b.packId);
    }),
  });

  const verified = [...catalogByPackId.values()].filter((row) => row.qaStatus === "auto_verified");

  console.log(`Tier-2000 generation complete.`);
  console.log(`  Targets: ${targets.length}`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Preserved auto_verified: ${preserved}`);
  console.log(`  Deduped targets: ${deduped}`);
  console.log(`  Skipped (--skip-existing): ${skipped}`);
  console.log(`  Catalog rows: ${catalogByPackId.size}`);
  console.log(`  Auto-verified (signup-ready): ${verified.length}`);

  if (issues.length > 0) {
    console.log("QA notes:");
    for (const issue of issues.slice(0, 20)) console.log(`  - ${issue}`);
    if (issues.length > 20) console.log(`  ... and ${issues.length - 20} more`);
  }
};

main();
