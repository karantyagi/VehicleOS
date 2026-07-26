import { readFileSync, writeFileSync } from "node:fs";
import { compareDualExtracts, dualExtractAgrees } from "./compare-extracts.js";
import { downloadOemPdf } from "./download-oem-pdf.js";
import { runDualExtract } from "./dual-extract/extract-pass-b.js";
import { generateMatchingFixture } from "./generate-matching-fixture.js";
import { upsertManifestEntry } from "./manifest.js";
import { packJsonPath, resolveExistingPdfPath } from "./paths.js";
import { resolvePdfSourceSpec } from "./pdf-source-registry.js";
import { writeReviewQueue } from "./write-review-queue.js";
import { loadOemSchedulePack } from "../load-catalog.js";
import { runPackQaRules, validateOemSchedulePack } from "../validate-pack.js";
import type { OemSchedulePack, OemSchedulePackEntry } from "../types.js";
import type { Tier1PackSpec } from "./tier1-manifest.js";

export type VerifyPackResult = {
  packId: string;
  phaseA: "ok" | "blocked";
  phaseB: {
    dualExtractAgree: boolean;
    mismatchCount: number;
    qaIssueCount: number;
    schemaValid: boolean;
  };
  reviewQueuePath?: string;
  fixturePath?: string;
  pdfPath?: string;
  notes: string[];
};

const mergeExtractIntoPack = (
  pack: OemSchedulePack,
  rows: Array<{
    rowKey: string;
    sourcePage: string;
    intervalMiles: number | null;
    intervalMonths: number | null;
  }>,
): OemSchedulePack => {
  const byKey = new Map(rows.map((row) => [row.rowKey, row]));
  const entries: OemSchedulePackEntry[] = pack.entries.map((entry) => {
    const extracted = byKey.get(entry.entryId);
    if (!extracted) return entry;
    const intervalMiles =
      extracted.intervalMiles != null &&
      extracted.intervalMiles >= 1000 &&
      extracted.intervalMiles <= 150_000
        ? extracted.intervalMiles
        : entry.intervalMiles;
    const intervalMonths =
      extracted.intervalMonths != null && extracted.intervalMonths > 0 && extracted.intervalMonths <= 120
        ? extracted.intervalMonths
        : entry.intervalMonths;
    return {
      ...entry,
      sourcePage: extracted.sourcePage,
      intervalMiles,
      intervalMonths,
    };
  });
  return { ...pack, entries };
};

const inferOemFamily = (make: string): Tier1PackSpec["oemFamily"] => {
  const normalized = make.toLowerCase();
  if (normalized === "acura") return "acura";
  if (normalized === "honda") return "honda";
  if (normalized === "toyota") return "toyota";
  if (normalized === "lexus") return "lexus";
  if (normalized === "chevrolet") return "chevy";
  if (normalized === "volkswagen") return "vw";
  if (normalized.includes("tesla")) return "tesla";
  return "ev-generic";
};

export const verifyOemPack = async (input: {
  packId: string;
  spec?: Tier1PackSpec;
  dryRun?: boolean;
}): Promise<VerifyPackResult> => {
  const notes: string[] = [];
  let pack = loadOemSchedulePack(input.packId);

  const spec =
    input.spec ??
    ({
      packId: pack.packId,
      make: pack.vehicle.make,
      model: pack.vehicle.model,
      year: pack.vehicle.year,
      trim: pack.vehicle.trim,
      oemFamily: inferOemFamily(pack.vehicle.make),
      scheduleKind: pack.scheduleKind ?? "fixed_interval",
    } satisfies Tier1PackSpec);

  const pdfSource = resolvePdfSourceSpec({
    packId: pack.packId,
    make: spec.make,
    model: spec.model,
    year: spec.year,
    oemFamily: spec.oemFamily,
  });

  let pdfPath = resolveExistingPdfPath(pack.packId);
  let downloadUrl: string | undefined;
  let sha256: string | undefined;

  if (!pdfPath) {
    const downloaded = await downloadOemPdf(pdfSource);
    if (!downloaded.ok) {
      const reviewQueuePath = writeReviewQueue({
        packId: pack.packId,
        mismatches: [],
        qaIssues: [],
        pdfMissing: true,
        triedUrls: downloaded.triedUrls,
        notes: [downloaded.reason],
      });

      generateMatchingFixture(pack);

      return {
        packId: pack.packId,
        phaseA: "blocked",
        phaseB: {
          dualExtractAgree: false,
          mismatchCount: 0,
          qaIssueCount: 0,
          schemaValid: true,
        },
        reviewQueuePath,
        notes: [`PDF blocked: ${downloaded.reason}`],
      };
    }

    pdfPath = downloaded.localPath;
    downloadUrl = downloaded.officialUrl;
    if (!downloaded.skippedDownload) {
      notes.push(`Downloaded PDF from ${downloaded.officialUrl}`);
    }
  } else {
    notes.push(`Using existing PDF at ${pdfPath}`);
  }

  if (!input.dryRun && pdfPath) {
    const { createHash } = await import("node:crypto");
    sha256 = createHash("sha256").update(readFileSync(pdfPath)).digest("hex");
    upsertManifestEntry({
      packId: pack.packId,
      localPdfPath: pdfPath,
      sha256,
      officialUrl: downloadUrl,
    });
  }

  const { passA, passB } = await runDualExtract({ pdfPath: pdfPath!, pack });
  const mismatches = compareDualExtracts({ passA, passB });
  const agree = dualExtractAgrees(mismatches);

  if (agree && pack.qaStatus !== "auto_verified") {
    pack = mergeExtractIntoPack(
      pack,
      passA.map((row) => ({
        rowKey: row.rowKey,
        sourcePage: row.sourcePage,
        intervalMiles: row.intervalMiles,
        intervalMonths: row.intervalMonths,
      })),
    );
    notes.push("Dual-extract agree — merged sourcePage citations");
  } else {
    notes.push(`${mismatches.length} dual-extract mismatch(es)`);
  }

  if (!input.dryRun) {
    const nextPack: OemSchedulePack = {
      ...pack,
      sourceManifestRef: `sources/manifest.json#${pack.packId}`,
    };

    if (pack.qaStatus !== "auto_verified") {
      nextPack.qaNotes = agree
        ? "Phase A+B complete — dual-extract agree. Awaiting Phase C promotion to auto_verified."
        : "Phase A+B complete — dual-extract mismatch. Creator review required (Phase C).";
      nextPack.qaStatus = "creator_review_required";
    }

    pack = nextPack;
    validateOemSchedulePack(pack);
    writeFileSync(packJsonPath(pack.packId), `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  }

  const qaIssues = runPackQaRules(pack);
  const fixture = generateMatchingFixture(pack);

  if (!input.dryRun && pdfPath && sha256) {
    upsertManifestEntry({
      packId: pack.packId,
      localPdfPath: pdfPath,
      sha256,
      officialUrl: downloadUrl,
      dualExtractAgree: agree,
      notes: agree ? "dual-extract agree" : `${mismatches.length} mismatches`,
    });
  }

  const reviewQueuePath = writeReviewQueue({
    packId: pack.packId,
    mismatches,
    qaIssues,
    dualExtractAgree: agree,
    notes,
  });

  return {
    packId: pack.packId,
    phaseA: "ok",
    phaseB: {
      dualExtractAgree: agree,
      mismatchCount: mismatches.length,
      qaIssueCount: qaIssues.length,
      schemaValid: true,
    },
    reviewQueuePath,
    fixturePath: `${fixture.packId}.json`,
    pdfPath: pdfPath ?? undefined,
    notes,
  };
};
