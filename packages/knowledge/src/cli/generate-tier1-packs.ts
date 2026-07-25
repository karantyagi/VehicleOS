import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { DOGFOOD_PACK_IDS, TIER1_PACK_SPECS } from "../factory/tier1-manifest.js";
import { generateTier1Pack } from "../factory/generate-pack.js";
import { runPackQaRules, validateOemSchedulePack } from "../validate-pack.js";
import type { SupportedVehicleCatalog } from "../types.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packsDir = join(packageRoot, "packs");
const catalogPath = join(packageRoot, "catalog", "supported-vehicles.v1.json");

const skipExisting = process.argv.includes("--skip-existing");

const loadExistingCatalog = (): SupportedVehicleCatalog => {
  if (!existsSync(catalogPath)) {
    return { version: 1, vehicles: [] };
  }
  return JSON.parse(readFileSync(catalogPath, "utf8")) as SupportedVehicleCatalog;
};

const writeCatalog = (catalog: SupportedVehicleCatalog) => {
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
};

const main = () => {
  const catalog = loadExistingCatalog();
  const catalogByPackId = new Map(catalog.vehicles.map((row) => [row.packId, row]));
  let generated = 0;
  let skipped = 0;
  const issues: string[] = [];

  for (const spec of TIER1_PACK_SPECS) {
    const packPath = join(packsDir, `${spec.packId}.v1.json`);
    if (skipExisting && existsSync(packPath)) {
      skipped += 1;
      continue;
    }

    const pack = generateTier1Pack(spec);
    validateOemSchedulePack(pack);
    const qaIssues = runPackQaRules(pack);
    if (qaIssues.length > 0) {
      issues.push(`${spec.packId}: ${qaIssues.join("; ")}`);
    }

    writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
    generated += 1;

    catalogByPackId.set(spec.packId, {
      packId: spec.packId,
      make: spec.make,
      model: spec.model,
      year: spec.year,
      trim: spec.trim,
      powertrain: spec.powertrain,
      qaStatus: pack.qaStatus,
      supportTier: "tier1",
    });
  }

  for (const packId of DOGFOOD_PACK_IDS) {
    if (!catalogByPackId.has(packId)) {
      issues.push(`${packId}: missing from catalog — add manually`);
    }
  }

  writeCatalog({
    version: 1,
    vehicles: [...catalogByPackId.values()].sort((a, b) => a.packId.localeCompare(b.packId)),
  });

  console.log(`Generated ${generated} packs, skipped ${skipped}.`);
  console.log(`Catalog rows: ${catalogByPackId.size}`);
  if (issues.length > 0) {
    console.log("QA notes:");
    for (const issue of issues) console.log(`  - ${issue}`);
  }
};

main();
