import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadOemSchedulePack } from "../src/load-catalog.js";
import { resolveKnowledgePackageRoot } from "../src/package-root.js";

const repoRoot = join(import.meta.dirname, "../../..");
const webAppRoot = join(repoRoot, "apps/web");
const stageRoot = join(webAppRoot, "knowledge-data");

/** Keep in sync with apps/web/scripts/stage-knowledge-assets.mjs */
const STAGED_DIRS = ["packs", "catalog", "aliases", "schemas", "sources"] as const;

const REQUIRED_STAGE_FILES = [
  "catalog/supported-vehicles.v1.json",
  "schemas/oem-schedule-pack.v1.schema.json",
  "schemas/service-alias-bundle.v1.schema.json",
  "packs/acura-tlx-2021-technology.v1.json",
  "aliases/global.v1.json",
] as const;

const priorCwd = process.cwd();

afterEach(() => {
  process.chdir(priorCwd);
});

describe("Vercel knowledge-data staging bundle", () => {
  it("copies every runtime directory required by @vehicleos/knowledge on serverless", () => {
    execSync("node scripts/stage-knowledge-assets.mjs", { cwd: webAppRoot, stdio: "pipe" });

    for (const dir of STAGED_DIRS) {
      expect(existsSync(join(stageRoot, dir))).toBe(true);
    }

    for (const file of REQUIRED_STAGE_FILES) {
      expect(existsSync(join(stageRoot, file))).toBe(true);
    }
  });

  it("loads and validates an OEM pack from staged knowledge-data (Vercel cwd simulation)", () => {
    execSync("node scripts/stage-knowledge-assets.mjs", { cwd: webAppRoot, stdio: "pipe" });
    process.chdir(webAppRoot);

    expect(resolveKnowledgePackageRoot()).toBe(stageRoot);

    const pack = loadOemSchedulePack("acura-tlx-2021-technology");
    expect(pack.packId).toBe("acura-tlx-2021-technology");
    expect(pack.entries.length).toBeGreaterThanOrEqual(10);
  });
});
