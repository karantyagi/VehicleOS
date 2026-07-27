import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const hasPacksDir = (root: string): boolean => existsSync(join(root, "packs"));

/** Resolve @vehicleos/knowledge root in source, vitest, and Vercel serverless bundles. */
export const resolveKnowledgePackageRoot = (): string => {
  const candidates: string[] = [];

  const cwd = process.cwd();
  candidates.push(join(cwd, "knowledge-data"));
  candidates.push(join(cwd, "apps/web/knowledge-data"));
  candidates.push(join(cwd, "apps/marketing/knowledge-data"));
  candidates.push(join(cwd, "packages/knowledge"));
  candidates.push(join(cwd, "../../packages/knowledge"));

  try {
    candidates.push(dirname(require.resolve("@vehicleos/knowledge/package.json")));
  } catch {
    // workspace package may not resolve from every runtime cwd
  }

  candidates.push(join(dirname(fileURLToPath(import.meta.url)), ".."));

  for (const root of candidates) {
    if (hasPacksDir(root)) return root;
  }

  for (const root of candidates) {
    if (existsSync(join(root, "package.json"))) return root;
  }

  return join(dirname(fileURLToPath(import.meta.url)), "..");
};
