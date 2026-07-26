import { readFileSync, writeFileSync } from "node:fs";
import { manifestPath } from "./paths.js";

export type SourceManifestEntry = {
  localPdfPaths?: string[];
  sha256?: Record<string, string>;
  officialUrls?: string[];
  mirrorUrls?: string[];
  notes?: string;
  verifiedAt?: string;
  dualExtractAgree?: boolean;
};

export type SourceManifest = {
  version: number;
  packs: Record<string, SourceManifestEntry>;
};

export const loadSourceManifest = (): SourceManifest => {
  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as SourceManifest;
  return raw;
};

export const saveSourceManifest = (manifest: SourceManifest): void => {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
};

export const upsertManifestEntry = (input: {
  packId: string;
  localPdfPath: string;
  sha256: string;
  officialUrl?: string;
  notes?: string;
  dualExtractAgree?: boolean;
}): SourceManifest => {
  const manifest = loadSourceManifest();
  const normalizedPath = input.localPdfPath.replaceAll("\\", "/");
  const relativePath = normalizedPath.replace(/^.*workspace\/knowledge\//, "workspace/knowledge/");
  const filename = relativePath.split("/").pop() ?? "owner-manual.pdf";

  const existing = manifest.packs[input.packId] ?? {};
  const localPdfPaths = Array.from(new Set([...(existing.localPdfPaths ?? []), relativePath]));
  const sha256 = { ...(existing.sha256 ?? {}), [filename]: input.sha256 };
  const officialUrls = input.officialUrl
    ? Array.from(new Set([...(existing.officialUrls ?? []), input.officialUrl]))
    : existing.officialUrls;

  manifest.packs[input.packId] = {
    ...existing,
    localPdfPaths,
    sha256,
    officialUrls,
    notes: input.notes ?? existing.notes,
    verifiedAt: new Date().toISOString().slice(0, 10),
    dualExtractAgree: input.dualExtractAgree ?? existing.dualExtractAgree,
  };

  saveSourceManifest(manifest);
  return manifest;
};
