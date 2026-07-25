import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { ownerManualPdfPath, sourceDirForPack } from "./paths.js";
import type { PdfSourceSpec } from "./pdf-source-registry.js";

export type DownloadOemPdfResult =
  | {
      ok: true;
      localPath: string;
      sha256: string;
      officialUrl: string;
      skippedDownload?: boolean;
    }
  | {
      ok: false;
      reason: string;
      triedUrls: string[];
    };

const sha256File = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

export const downloadOemPdf = async (spec: PdfSourceSpec): Promise<DownloadOemPdfResult> => {
  const dest = ownerManualPdfPath(spec.packId);
  if (existsSync(dest)) {
    return {
      ok: true,
      localPath: dest,
      sha256: sha256File(dest),
      officialUrl: spec.candidateUrls[0] ?? "local-existing",
      skippedDownload: true,
    };
  }

  if (spec.candidateUrls.length === 0) {
    return { ok: false, reason: "No candidate URLs configured", triedUrls: [] };
  }

  mkdirSync(sourceDirForPack(spec.packId), { recursive: true });

  for (const url of spec.candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "VehicleOS-OEM-KB-Factory/1.0" },
        redirect: "follow",
      });
      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("pdf") && !url.endsWith(".pdf")) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 10_000) continue;
      if (buffer.subarray(0, 4).toString() !== "%PDF") continue;

      writeFileSync(dest, buffer);
      return {
        ok: true,
        localPath: dest,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        officialUrl: url,
      };
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    reason: "All candidate URLs failed (404 or non-PDF)",
    triedUrls: spec.candidateUrls,
  };
};
