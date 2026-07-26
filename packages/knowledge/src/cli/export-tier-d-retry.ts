import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadTier2000SourceByPackId } from "../factory/load-tier2000-registry.js";
import { loadSourceManifest } from "../factory/manifest.js";
import { tier2000RegistryRoot } from "../factory/load-tier2000-registry.js";

const main = () => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const manifest = loadSourceManifest();

  const tierD = catalog.vehicles.filter(
    (row) =>
      row.qaStatus === "creator_review_required" &&
      sources.get(row.packId)?.sourceTier === "D",
  );

  const blocked = catalog.vehicles.filter((row) => {
    if (row.qaStatus === "auto_verified") return false;
    const man = manifest.packs[row.packId];
    const src = sources.get(row.packId);
    return (
      (src?.sourceTier === "B" || src?.sourceTier === "C") &&
      man &&
      !man.localPdfPaths?.length &&
      man.notes?.toLowerCase().includes("blocked")
    );
  });

  const packIds = [...new Set([...tierD, ...blocked].map((row) => row.packId))].sort();

  const header = "pack_id,year,make,model,trim,oem_family,retry_kind,priority\n";
  const body = packIds
    .map((packId) => {
      const row = catalog.vehicles.find((vehicle) => vehicle.packId === packId)!;
      const src = sources.get(packId);
      const kind = src?.sourceTier === "D" ? "tier_d" : "url_blocked";
      const targetLine = `${row.packId},${row.year},${row.make},${row.model},${row.trim}`;
      return `"${row.packId}",${row.year},"${row.make}","${row.model}","${row.trim}","${src?.sourceTier === "D" ? "unknown" : "bc"}","${kind}",""`;
    })
    .join("\n");

  const outPath = join(tier2000RegistryRoot, "tier-2000-tier-d-retry.csv");
  writeFileSync(outPath, `${header}${body}\n`);
  console.log(`Wrote ${packIds.length} rows (${tierD.length} Tier D + ${blocked.length} blocked) to ${outPath}`);
};

main();
