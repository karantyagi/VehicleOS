import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadOemSchedulePack } from "../src/load-catalog.js";
import { resolveCanonicalServiceFromLine } from "../src/factory/resolve-alias.js";
import { matchingFixturesRoot } from "../src/factory/paths.js";

type MatchingFixture = {
  packId: string;
  version: number;
  cases: Array<{
    carfaxLine: string;
    expectedCanonicalServiceId: string;
    expectedEntryId: string;
  }>;
};

const fixtureFiles = readdirSync(matchingFixturesRoot).filter((file) => file.endsWith(".json"));

describe("matching fixtures (B5)", () => {
  it("has at least one fixture per on-disk pack", () => {
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(51);
  });

  for (const file of fixtureFiles) {
    const fixture = JSON.parse(
      readFileSync(join(matchingFixturesRoot, file), "utf8"),
    ) as MatchingFixture;

    it(`${fixture.packId} CARFAX lines resolve to expected pack entries`, () => {
      const pack = loadOemSchedulePack(fixture.packId);
      const allowedCanonicalIds = new Set(pack.entries.map((entry) => entry.canonicalServiceId));
      for (const testCase of fixture.cases) {
        const canonical = resolveCanonicalServiceFromLine(testCase.carfaxLine, { allowedCanonicalIds });
        expect(canonical).toBe(testCase.expectedCanonicalServiceId);
        const entry = pack.entries.find((row) => row.entryId === testCase.expectedEntryId);
        expect(entry?.canonicalServiceId).toBe(testCase.expectedCanonicalServiceId);
      }
    });
  }
});
