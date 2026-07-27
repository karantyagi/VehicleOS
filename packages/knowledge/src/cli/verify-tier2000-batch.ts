import { readFileSync } from "node:fs";
import { verifyOemPack } from "../factory/verify-pack.js";
import { listVerifyCandidates, countVerifyCandidates } from "../factory/verify-candidates.js";
import { syncCatalogQaFromPacks } from "../factory/promote-pack.js";
import { matchingFixturesRoot } from "../factory/paths.js";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const dryRun = args.includes("--dry-run");
const promote = args.includes("--promote");
const tier2BcOnly = args.includes("--tier2-bc");
const skipVerified = args.includes("--skip-verified");
const concurrency = Number.parseInt(
  args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ?? "4",
  10,
);

const shardArg = args.find((arg) => arg.startsWith("--shard="))?.split("=")[1];
const [shardIndexRaw, shardCountRaw] = shardArg?.split("/") ?? [];
const shardIndex = shardIndexRaw != null ? Number.parseInt(shardIndexRaw, 10) : undefined;
const shardCount = shardCountRaw != null ? Number.parseInt(shardCountRaw, 10) : undefined;

const packListFile = args.find((arg) => arg.startsWith("--pack-list="))?.split("=")[1];

const resolvePackIds = (): string[] => {
  if (packListFile) {
    const catalog = loadSupportedVehicleCatalog();
    const verified = new Set(
      catalog.vehicles.filter((row) => row.qaStatus === "auto_verified").map((row) => row.packId),
    );
    return readFileSync(packListFile, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((packId) => !skipVerified || !verified.has(packId));
  }

  return listVerifyCandidates({
    tier2BcOnly,
    skipFactoryVerified: skipVerified,
    shardIndex,
    shardCount,
  });
};

const packIds = resolvePackIds();

const runBatch = async (): Promise<void> => {
  const counts = countVerifyCandidates();
  console.log("Factory verify batch");
  console.log(`  candidates: ${packIds.length}`);
  console.log(`  tier2 B/C total: ${counts.tier2Bc}`);
  console.log(`  scaffold auto_verified: ${counts.scaffoldAutoVerified}`);
  console.log(`  factory verified: ${counts.factoryVerified}`);
  console.log(`  concurrency=${concurrency} promote=${promote} dryRun=${dryRun}`);
  if (shardCount && shardCount > 1) {
    console.log(`  shard=${shardIndex}/${shardCount}`);
  }

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
          phaseB: {
            dualExtractAgree: false,
            mismatchCount: 0,
            qaIssueCount: 0,
            schemaValid: false,
          },
          notes: [`ERROR: ${error.message}`],
        })),
      ),
    );

    for (const result of results) {
      if (result.phaseA === "blocked") blocked += 1;
      else if (!result.phaseB.dualExtractAgree) mismatch += 1;
      else agree += 1;

      if (result.notes.some((note) => note.includes("Promoted to auto_verified"))) {
        promoted += 1;
      }

      console.log(
        [
          result.packId,
          result.phaseA === "blocked" ? "BLOCKED" : result.phaseB.dualExtractAgree ? "AGREE" : "MISMATCH",
          result.notes.some((note) => note.includes("Promoted")) ? "PROMOTED" : "",
          result.notes.slice(0, 2).join("; "),
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
  }

  if (!dryRun && promote) {
    const sync = syncCatalogQaFromPacks();
    console.log(`Catalog synced (${sync.updated} row updates).`);
  }

  console.log("");
  console.log(
    `Done. agree=${agree} mismatch=${mismatch} blocked=${blocked} promoted=${promoted}`,
  );
  console.log(`Fixtures: ${matchingFixturesRoot}`);
};

runBatch().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
