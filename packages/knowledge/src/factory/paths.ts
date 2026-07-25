import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const knowledgePackageRoot = packageRoot;

export const repoRoot = join(packageRoot, "../..");

/** Workspace knowledge lives outside the product repo (PDFs gitignored). */
export const workspaceKnowledgeRoot = join(repoRoot, "../../workspace/knowledge");

export const workspaceSourcesRoot = join(workspaceKnowledgeRoot, "sources");

export const workspaceReviewQueueRoot = join(workspaceKnowledgeRoot, "review-queue");

export const manifestPath = join(packageRoot, "sources", "manifest.json");

export const matchingFixturesRoot = join(packageRoot, "fixtures", "matching");

export const packJsonPath = (packId: string): string =>
  join(packageRoot, "packs", `${packId}.v1.json`);

export const sourceDirForPack = (packId: string): string =>
  join(workspaceSourcesRoot, packId);

export const ownerManualPdfPath = (packId: string): string =>
  join(sourceDirForPack(packId), "owner-manual.pdf");

export const reviewQueuePath = (packId: string): string =>
  join(workspaceReviewQueueRoot, `${packId}.md`);

export const matchingFixturePath = (packId: string): string =>
  join(matchingFixturesRoot, `${packId}.json`);

export const resolveExistingPdfPath = (packId: string): string | null => {
  const candidates = [
    join(sourceDirForPack(packId), "maintenance-minder-official-supplement.pdf"),
    join(sourceDirForPack(packId), "maintenance-minder-supplement.pdf"),
    join(sourceDirForPack(packId), "maintenance-minder.pdf"),
    ownerManualPdfPath(packId),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
};
