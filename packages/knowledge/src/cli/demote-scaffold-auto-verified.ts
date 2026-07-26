import { writeFileSync } from "node:fs";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadSourceManifest } from "../factory/manifest.js";
import { packJsonPath } from "../factory/paths.js";
import { loadOemSchedulePack } from "../load-catalog.js";
import { validateOemSchedulePack } from "../validate-pack.js";
import type { OemSchedulePack } from "../types.js";

const dryRun = process.argv.includes("--dry-run");

const main = () => {
  const catalog = loadSupportedVehicleCatalog();
  const manifest = loadSourceManifest();
  let demoted = 0;

  for (const row of catalog.vehicles) {
    if (row.supportTier !== "tier2") continue;
    if (row.qaStatus !== "auto_verified") continue;

    const manifestEntry = manifest.packs[row.packId];
    if (manifestEntry?.dualExtractAgree) continue;

    const pack = loadOemSchedulePack(row.packId);
    const demotedPack: OemSchedulePack = {
      ...pack,
      qaStatus: "creator_review_required",
      qaNotes:
        "Scaffold auto_verified revoked — awaiting factory Phase A+B verify and dual-extract promotion.",
    };

    if (!dryRun) {
      validateOemSchedulePack(demotedPack);
      writeFileSync(packJsonPath(row.packId), `${JSON.stringify(demotedPack, null, 2)}\n`, "utf8");
    }
    demoted += 1;
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Demoted ${demoted} tier-2 scaffold auto_verified pack(s).`);
  if (!dryRun && demoted > 0) {
    console.log("Run: pnpm --filter @vehicleos/knowledge sync:catalog");
  }
};

main();
