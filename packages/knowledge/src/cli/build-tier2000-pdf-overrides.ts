import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  loadTier2000SourceRegistry,
  tier2000RegistryRoot,
} from "../factory/load-tier2000-registry.js";

const main = () => {
  const overrides: Record<string, string[]> = {};

  for (const row of loadTier2000SourceRegistry()) {
    if (row.sourceTier !== "B" && row.sourceTier !== "C") continue;
    if (!row.primaryPdfUrl) continue;

    const urls = [row.primaryPdfUrl, ...row.alternatePdfUrls].filter(Boolean);
    overrides[row.packId] = Array.from(new Set(urls));
  }

  const outputPath = join(tier2000RegistryRoot, "tier-2000-pdf-overrides.json");
  writeFileSync(outputPath, `${JSON.stringify(overrides, null, 2)}\n`);

  console.log(`Wrote ${Object.keys(overrides).length} PDF override entries to ${outputPath}`);
};

main();
