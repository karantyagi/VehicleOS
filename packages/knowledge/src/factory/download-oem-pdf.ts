import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { ownerManualPdfPath, sourceDirForPack } from "./paths.js";
import type { PdfSourceSpec } from "./pdf-source-registry.js";

export type DownloadOemPdfInput = PdfSourceSpec & {
  expectedSha256?: string;
};

export type DownloadOemPdfResult =
  | {
      ok: true;
      localPath: string;
      sha256: string;
      downloadUrl?: string;
      skippedDownload?: boolean;
      redownloaded?: boolean;
      sha256Verified?: boolean;
    }
  | {
      ok: false;
      reason: string;
      triedUrls: string[];
      sha256Mismatch?: boolean;
    };

const sha256File = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const fetchPdfToPath = async (url: string, dest: string): Promise<{ sha256: string } | null> => {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "VehicleOS-OEM-KB-Factory/1.0" },
      redirect: "follow",
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf") && !url.endsWith(".pdf")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 10_000) return null;
    if (buffer.subarray(0, 4).toString() !== "%PDF") return null;

    writeFileSync(dest, buffer);
    return { sha256: createHash("sha256").update(buffer).digest("hex") };
  } catch {
    return null;
  }
};

export const downloadOemPdf = async (spec: DownloadOemPdfInput): Promise<DownloadOemPdfResult> => {
  const dest = ownerManualPdfPath(spec.packId);
  const hadExistingFile = existsSync(dest);

  if (hadExistingFile) {
    const sha256 = sha256File(dest);
    if (!spec.expectedSha256 || sha256 === spec.expectedSha256) {
      return {
        ok: true,
        localPath: dest,
        sha256,
        skippedDownload: true,
        sha256Verified: Boolean(spec.expectedSha256),
      };
    }
    unlinkSync(dest);
  }

  if (spec.candidateUrls.length === 0) {
    return {
      ok: false,
      reason: hadExistingFile
        ? "Local PDF SHA-256 mismatch and no candidate URLs configured"
        : "No candidate URLs configured",
      triedUrls: [],
      sha256Mismatch: hadExistingFile,
    };
  }

  mkdirSync(sourceDirForPack(spec.packId), { recursive: true });

  for (const url of spec.candidateUrls) {
    const fetched = await fetchPdfToPath(url, dest);
    if (!fetched) continue;

    if (spec.expectedSha256 && fetched.sha256 !== spec.expectedSha256) {
      unlinkSync(dest);
      continue;
    }

    return {
      ok: true,
      localPath: dest,
      sha256: fetched.sha256,
      downloadUrl: url,
      redownloaded: hadExistingFile,
      sha256Verified: Boolean(spec.expectedSha256),
    };
  }

  return {
    ok: false,
    reason: hadExistingFile
      ? "Local PDF SHA-256 mismatch and all candidate URLs failed (404 or non-PDF)"
      : "All candidate URLs failed (404 or non-PDF)",
    triedUrls: spec.candidateUrls,
    sha256Mismatch: hadExistingFile,
  };
};
