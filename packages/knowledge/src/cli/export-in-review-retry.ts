import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadTier2000SourceByPackId } from "../factory/load-tier2000-registry.js";
import { loadSourceManifest } from "../factory/manifest.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(packageRoot, "sources/registries/tier-2000/tier-2000-in-review-retry.csv");

const main = () => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const manifest = loadSourceManifest();

  const rows = catalog.vehicles.filter((row) => {
    if (row.qaStatus !== "creator_review_required") return false;
    const tier = sources.get(row.packId)?.sourceTier;
    return tier === "B" || tier === "C" || !sources.get(row.packId);
  });

  const header =
    "pack_id,year,make,model,trim,source_tier,retry_reason,has_pdf,manifest_dual_extract_agree\n";
  const body = rows
    .map((row) => {
      const src = sources.get(row.packId);
      const man = manifest.packs[row.packId];
      const tier = src?.sourceTier ?? "unknown";
      const hasPdf = man?.localPdfPaths?.length ? "yes" : "no";
      const agree = man?.dualExtractAgree === true ? "yes" : man?.dualExtractAgree === false ? "no" : "";
      let reason = "mismatch";
      if (!man) reason = "no_manifest";
      else if (!man.localPdfPaths?.length) reason = "pdf_blocked";
      else if (man.dualExtractAgree === false) reason = "dual_extract_mismatch";
      return [
        row.packId,
        row.year,
        row.make,
        row.model,
        row.trim,
        tier,
        reason,
        hasPdf,
        agree,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    })
    .join("\n");

  writeFileSync(outPath, `${header}${body}\n`);
  console.log(`Wrote ${rows.length} in-review B/C retry rows to ${outPath}`);
};

main();
