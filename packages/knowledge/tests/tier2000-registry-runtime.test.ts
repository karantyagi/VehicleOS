import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  listKnowledgeRootCandidates,
  resolveKnowledgePackageRoot,
  resolveOemPackPath,
} from "../src/package-root.js";
import {
  loadTier2000SourceByPackId,
  loadTier2000SourceRegistry,
  tier2000RegistryRoot,
} from "../src/factory/load-tier2000-registry.js";

describe("resolveKnowledgePackageRoot", () => {
  it("points at packages/knowledge (not src/factory)", () => {
    const root = resolveKnowledgePackageRoot();
    expect(existsSync(join(root, "catalog/supported-vehicles.v1.json"))).toBe(true);
    expect(existsSync(join(root, "sources/registries/tier-2000"))).toBe(true);
    expect(existsSync(join(root, "packs/acura-tlx-2021-sh-awd.v1.json"))).toBe(true);
  });

  it("resolves a concrete OEM pack path on disk", () => {
    const packPath = resolveOemPackPath("acura-tlx-2021-sh-awd");
    expect(existsSync(packPath)).toBe(true);
    expect(listKnowledgeRootCandidates().length).toBeGreaterThan(0);
  });
});

describe("tier2000 registry runtime paths", () => {
  it("resolves registry CSVs from @vehicleos/knowledge package root", () => {
    expect(existsSync(tier2000RegistryRoot)).toBe(true);
    expect(existsSync(join(tier2000RegistryRoot, "tier-2000-oem-manual-sources.csv"))).toBe(true);
  });

  it("loads merged v1+v2+v3 registry without throwing", () => {
    const rows = loadTier2000SourceRegistry();
    expect(rows.length).toBeGreaterThan(1000);
  });

  it("indexes registry rows by normalized packId", () => {
    const byPackId = loadTier2000SourceByPackId();
    expect(byPackId.size).toBeGreaterThan(1000);
    expect(byPackId.has("acura-tlx-2022-sh-awd")).toBe(true);
  });
});
