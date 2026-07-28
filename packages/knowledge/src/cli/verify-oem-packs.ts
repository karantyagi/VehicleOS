import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TIER1_PACK_SPECS } from "../factory/tier1-manifest.js";
import { verifyOemPack, type VerifyPackResult } from "../factory/verify-pack.js";
import { matchingFixturesRoot, knowledgePackageRoot } from "../factory/paths.js";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const packFlag = args.find((arg) => arg.startsWith("--pack="))?.split("=")[1];
const all = args.includes("--all");
const dryRun = args.includes("--dry-run");
const concurrency = Number.parseInt(args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] ?? "4", 10);

const packIds = packFlag
  ? [packFlag]
  : all
    ? [
        "acura-tlx-2021-sh-awd",
        ...TIER1_PACK_SPECS.map((spec) => spec.packId),
        ...readdirSync(join(knowledgePackageRoot, "packs"))
          .filter((file) => file.endsWith(".v1.json"))
          .map((file) => file.replace(".v1.json", "")),
      ].filter((value, index, array) => array.indexOf(value) === index)
    : ["acura-tlx-2021-sh-awd"];

const specById = new Map(TIER1_PACK_SPECS.map((spec) => [spec.packId, spec]));

const runBatch = async (): Promise<void> => {
  console.log(`verify-oem-packs: ${packIds.length} pack(s), concurrency=${concurrency}, dryRun=${dryRun}`);

  let ok = 0;
  let blocked = 0;
  let mismatched = 0;

  for (let index = 0; index < packIds.length; index += concurrency) {
    const slice = packIds.slice(index, index + concurrency);
    const results = await Promise.all(
      slice.map((packId) =>
        verifyOemPack({ packId, spec: specById.get(packId), dryRun }).catch(
          (error: Error): VerifyPackResult => ({
            packId,
            phaseA: "blocked",
            phaseB: {
              dualExtractAgree: false,
              mismatchCount: 0,
              qaIssueCount: 0,
              schemaValid: false,
            },
            notes: [`ERROR: ${error.message}`],
          }),
        ),
      ),
    );

    for (const result of results) {
      if (result.phaseA === "blocked") blocked += 1;
      else if (!result.phaseB.dualExtractAgree) mismatched += 1;
      else ok += 1;

      console.log(
        [
          result.packId,
          result.phaseA === "blocked" ? "BLOCKED" : result.phaseB.dualExtractAgree ? "AGREE" : "MISMATCH",
          result.reviewQueuePath ? "review-queue" : "",
          result.notes.join("; "),
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
  }

  console.log("");
  console.log(`Done. agree=${ok} mismatch=${mismatched} blocked=${blocked}`);
  console.log(`Fixtures: ${matchingFixturesRoot}`);
};

runBatch().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
