import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const hasPacksDir = (root: string): boolean => existsSync(join(root, "packs"));

const isKnowledgeRoot = (root: string): boolean =>
  hasPacksDir(root) ||
  existsSync(join(root, "catalog/supported-vehicles.v1.json")) ||
  existsSync(join(root, "sources/registries/tier-2000"));

export const listKnowledgeRootCandidates = (): string[] => {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "knowledge-data"),
    join(cwd, "apps/web/knowledge-data"),
    join(cwd, "apps/marketing/knowledge-data"),
    join(cwd, "packages/knowledge"),
    join(cwd, "../../packages/knowledge"),
    sourceRoot,
  ];

  try {
    candidates.push(dirname(require.resolve("@vehicleos/knowledge/package.json")));
  } catch {
    // workspace package may not resolve from every runtime cwd
  }

  return [...new Set(candidates)];
};

/** Resolve @vehicleos/knowledge root in source, vitest, and Vercel serverless bundles. */
export const resolveKnowledgePackageRoot = (): string => {
  for (const root of listKnowledgeRootCandidates()) {
    if (isKnowledgeRoot(root)) return root;
  }

  return sourceRoot;
};

/** Find a concrete OEM pack file — never guess a root without the file on disk. */
export const resolveOemPackPath = (packId: string): string => {
  const fileName = `${packId}.v1.json`;

  for (const root of listKnowledgeRootCandidates()) {
    const packPath = join(root, "packs", fileName);
    if (existsSync(packPath)) return packPath;
  }

  throw new Error(`OEM pack file not found: ${fileName}`);
};
