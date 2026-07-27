import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

/** Resolve @vehicleos/knowledge root in source, vitest, and Vercel serverless bundles. */
export const resolveKnowledgePackageRoot = (): string => {
  try {
    return dirname(require.resolve("@vehicleos/knowledge/package.json"));
  } catch {
    return join(dirname(fileURLToPath(import.meta.url)), "..");
  }
};
