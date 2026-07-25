import { mkdirSync, writeFileSync } from "node:fs";
import type { OemSchedulePack } from "../types.js";
import { loadServiceAliasBundles } from "../load-catalog.js";
import { matchingFixturesRoot, matchingFixturePath } from "./paths.js";
import { resolveCanonicalServiceFromLine } from "./resolve-alias.js";

export type MatchingFixture = {
  packId: string;
  version: 1;
  cases: Array<{
    description: string;
    carfaxLine: string;
    expectedCanonicalServiceId: string;
    expectedEntryId: string;
  }>;
};

const defaultCasesForPack = (pack: OemSchedulePack): MatchingFixture["cases"] => {
  const bundles = loadServiceAliasBundles();
  const canonicalIds = new Set(pack.entries.map((entry) => entry.canonicalServiceId));
  const cases: MatchingFixture["cases"] = [];

  const candidateLines = bundles
    .flatMap((bundle) => bundle.aliases)
    .filter((alias) => canonicalIds.has(alias.canonicalServiceId))
    .sort((a, b) => a.priority - b.priority);

  for (const alias of candidateLines) {
    const entry = pack.entries.find((row) => row.canonicalServiceId === alias.canonicalServiceId);
    if (!entry) continue;
    if (cases.some((item) => item.expectedEntryId === entry.entryId)) continue;

    const allowed = new Set(pack.entries.map((row) => row.canonicalServiceId));
    const resolved = resolveCanonicalServiceFromLine(alias.phrase, { allowedCanonicalIds: allowed });
    if (resolved !== alias.canonicalServiceId) continue;

    cases.push({
      description: `CARFAX line maps to ${entry.entryId}`,
      carfaxLine: alias.phrase,
      expectedCanonicalServiceId: alias.canonicalServiceId,
      expectedEntryId: entry.entryId,
    });

    if (cases.length >= 4) break;
  }

  if (cases.length === 0 && pack.entries[0]) {
    cases.push({
      description: "Baseline pack entry smoke",
      carfaxLine: pack.entries[0].serviceName,
      expectedCanonicalServiceId: pack.entries[0].canonicalServiceId,
      expectedEntryId: pack.entries[0].entryId,
    });
  }

  return cases;
};

export const generateMatchingFixture = (pack: OemSchedulePack): MatchingFixture => {
  const fixture: MatchingFixture = {
    packId: pack.packId,
    version: 1,
    cases: defaultCasesForPack(pack),
  };

  mkdirSync(matchingFixturesRoot, { recursive: true });
  writeFileSync(matchingFixturePath(pack.packId), `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
};
