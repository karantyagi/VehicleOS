import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadSourceManifest } from "./manifest.js";
import { loadTier2000SourceByPackId } from "./load-tier2000-registry.js";
import { TIER1_PACK_SPECS } from "./tier1-manifest.js";

export type VerifyCandidateFilter = {
  tier2BcOnly?: boolean;
  skipFactoryVerified?: boolean;
  shardIndex?: number;
  shardCount?: number;
};

export const listVerifyCandidates = (filter: VerifyCandidateFilter = {}): string[] => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const manifest = loadSourceManifest();
  const tier1Ids = new Set(TIER1_PACK_SPECS.map((spec) => spec.packId));

  let packIds = catalog.vehicles.map((row) => row.packId);

  if (filter.tier2BcOnly) {
    packIds = packIds.filter((packId) => {
      const source = sources.get(packId);
      return source?.sourceTier === "B" || source?.sourceTier === "C";
    });
  }

  if (filter.skipFactoryVerified) {
    packIds = packIds.filter((packId) => {
      const entry = manifest.packs[packId];
      const row = catalog.vehicles.find((vehicle) => vehicle.packId === packId);
      return !(entry?.dualExtractAgree && row?.qaStatus === "auto_verified");
    });
  }

  packIds = packIds.filter((packId, index, array) => array.indexOf(packId) === index);
  packIds.sort((a, b) => a.localeCompare(b));

  if (filter.shardCount && filter.shardCount > 1 && filter.shardIndex != null) {
    packIds = packIds.filter((_, index) => index % filter.shardCount! === filter.shardIndex!);
  }

  return packIds;
};

export const countVerifyCandidates = (): {
  tier2Bc: number;
  tier2D: number;
  factoryVerified: number;
  scaffoldAutoVerified: number;
} => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const manifest = loadSourceManifest();

  let tier2Bc = 0;
  let tier2D = 0;
  let factoryVerified = 0;
  let scaffoldAutoVerified = 0;

  for (const row of catalog.vehicles) {
    const source = sources.get(row.packId);
    if (source?.sourceTier === "B" || source?.sourceTier === "C") tier2Bc += 1;
    if (source?.sourceTier === "D") tier2D += 1;

    const entry = manifest.packs[row.packId];
    if (entry?.dualExtractAgree && row.qaStatus === "auto_verified") {
      factoryVerified += 1;
    } else if (row.supportTier === "tier2" && row.qaStatus === "auto_verified") {
      scaffoldAutoVerified += 1;
    }
  }

  return { tier2Bc, tier2D, factoryVerified, scaffoldAutoVerified };
};
