import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { mergeProvenanceUrls } from "./pdf-url-classify.js";
import { manifestPath } from "./paths.js";

const manifestLockPath = `${manifestPath}.lock`;

const withManifestLock = <T>(operation: () => T): T => {
  mkdirSync(manifestPath.replace(/\/[^/]+$/, ""), { recursive: true });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      writeFileSync(manifestLockPath, `${process.pid}\n`, { flag: "wx" });
      try {
        return operation();
      } finally {
        if (existsSync(manifestLockPath)) rmSync(manifestLockPath);
      }
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  throw new Error("Timed out waiting for manifest lock");
};

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
  withManifestLock(() => {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  });
};

export const getExpectedPackSha256 = (
  packId: string,
  filename = "owner-manual.pdf",
): string | undefined => {
  const manifest = loadSourceManifest();
  return manifest.packs[packId]?.sha256?.[filename];
};

export const upsertManifestEntry = (input: {
  packId: string;
  localPdfPath: string;
  sha256: string;
  officialUrls?: string[];
  mirrorUrls?: string[];
  downloadUrl?: string;
  notes?: string;
  dualExtractAgree?: boolean;
}): SourceManifest => {
  return withManifestLock(() => {
    const manifest = loadSourceManifest();
    const normalizedPath = input.localPdfPath.replaceAll("\\", "/");
    const relativePath = normalizedPath.replace(/^.*workspace\/knowledge\//, "workspace/knowledge/");
    const filename = relativePath.split("/").pop() ?? "owner-manual.pdf";

    const existing = manifest.packs[input.packId] ?? {};
    const localPdfPaths = Array.from(new Set([...(existing.localPdfPaths ?? []), relativePath]));
    const sha256 = { ...(existing.sha256 ?? {}), [filename]: input.sha256 };
    const { officialUrls, mirrorUrls } = mergeProvenanceUrls({
      existingOfficial: existing.officialUrls,
      existingMirror: existing.mirrorUrls,
      specOfficial: input.officialUrls,
      specMirror: input.mirrorUrls,
      downloadUrl: input.downloadUrl,
    });

    manifest.packs[input.packId] = {
      ...existing,
      localPdfPaths,
      sha256,
      officialUrls,
      mirrorUrls,
      notes: input.notes ?? existing.notes,
      verifiedAt: new Date().toISOString().slice(0, 10),
      dualExtractAgree: input.dualExtractAgree ?? existing.dualExtractAgree,
    };

    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  });
};
