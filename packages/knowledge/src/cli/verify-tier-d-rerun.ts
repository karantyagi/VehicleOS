import { verifyOemPack } from "../factory/verify-pack.js";
import { syncCatalogQaFromPacks } from "../factory/promote-pack.js";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadTier2000SourceByPackId, tier2000RegistryRoot } from "../factory/load-tier2000-registry.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const dryRun = args.includes("--dry-run");
const promote = args.includes("--promote");
const concurrency = Number.parseInt(
  args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ?? "4",
  10,
);

const loadTierDRetryPackIds = (): Set<string> => {
  const csvPath = join(tier2000RegistryRoot, "tier-2000-tier-d-retry.csv");
  const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const packIds = new Set<string>();
  for (const line of lines.slice(1)) {
    const match = line.match(/^"(?:\d+|)","([^"]+)"/);
    if (match?.[1]) packIds.add(match[1]);
  }
  return packIds;
};

const resolveRetryPackIds = (): string[] => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const tierDRetry = loadTierDRetryPackIds();

  return catalog.vehicles
    .filter((row) => {
      if (!tierDRetry.has(row.packId)) return false;
      if (row.qaStatus !== "creator_review_required") return false;
      const tier = sources.get(row.packId)?.sourceTier;
      return tier === "B" || tier === "C";
    })
    .map((row) => row.packId)
    .sort((a, b) => a.localeCompare(b));
};

const runBatch = async (): Promise<void> => {
  const packIds = resolveRetryPackIds();
  console.log(`Tier D → B/C factory verify: ${packIds.length} pack(s), promote=${promote}`);

  let agree = 0;
  let mismatch = 0;
  let blocked = 0;
  let promoted = 0;

  for (let index = 0; index < packIds.length; index += concurrency) {
    const slice = packIds.slice(index, index + concurrency);
    const results = await Promise.all(
      slice.map((packId) =>
        verifyOemPack({ packId, dryRun, promote }).catch((error: Error) => ({
          packId,
          phaseA: "blocked" as const,
          phaseB: { dualExtractAgree: false, mismatchCount: 0, qaIssueCount: 0, schemaValid: false },
          notes: [`ERROR: ${error.message}`],
        })),
      ),
    );

    for (const result of results) {
      if (result.phaseA === "blocked") blocked += 1;
      else if (!result.phaseB.dualExtractAgree) mismatch += 1;
      else agree += 1;
      if (result.notes.some((note) => note.includes("Promoted to auto_verified"))) promoted += 1;

      if (index % 40 === 0 || result.phaseB.dualExtractAgree) {
        console.log(
          [
            result.packId,
            result.phaseA === "blocked" ? "BLOCKED" : result.phaseB.dualExtractAgree ? "AGREE" : "MISMATCH",
            result.notes.some((n) => n.includes("Promoted")) ? "PROMOTED" : "",
          ]
            .filter(Boolean)
            .join(" | "),
        );
      }
    }
  }

  if (!dryRun && promote) syncCatalogQaFromPacks();
  console.log(`Done. agree=${agree} mismatch=${mismatch} blocked=${blocked} promoted=${promoted}`);
};

runBatch().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
