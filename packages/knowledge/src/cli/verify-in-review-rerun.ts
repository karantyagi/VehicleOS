import { verifyOemPack } from "../factory/verify-pack.js";
import { syncCatalogQaFromPacks } from "../factory/promote-pack.js";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadTier2000SourceByPackId } from "../factory/load-tier2000-registry.js";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const dryRun = args.includes("--dry-run");
const promote = args.includes("--promote");
const concurrency = Number.parseInt(
  args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ?? "4",
  10,
);

const resolveRetryPackIds = (): string[] => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();

  return catalog.vehicles
    .filter((row) => {
      if (row.qaStatus !== "creator_review_required") return false;
      const tier = sources.get(row.packId)?.sourceTier;
      return tier === "B" || tier === "C";
    })
    .map((row) => row.packId)
    .sort((a, b) => a.localeCompare(b));
};

const runBatch = async (): Promise<void> => {
  const packIds = resolveRetryPackIds();
  console.log(`In-review B/C retry: ${packIds.length} pack(s), promote=${promote}`);

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
