import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileServiceAliasRegistry } from "@vehicleos/domain";
import supportedVehicleCatalogJson from "../catalog/supported-vehicles.v1.json" with { type: "json" };
import type { OemSchedulePack, ServiceAliasBundle, SupportedVehicleCatalog } from "./types.js";
import { validateOemSchedulePack, validateServiceAliasBundle } from "./validate-pack.js";
import { resolveKnowledgePackageRoot, resolveOemPackPath } from "./package-root.js";

const knowledgeRoot = (): string => resolveKnowledgePackageRoot();

export const loadOemSchedulePack = (packId: string): OemSchedulePack => {
  const path = resolveOemPackPath(packId);
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return validateOemSchedulePack(raw);
};

export const loadServiceAliasBundles = (): ServiceAliasBundle[] => {
  const files = [
    "global.v1.json",
    "acura-maintenance-minder.v1.json",
    "honda-maintenance-minder.v1.json",
    "toyota-maintenance-required.v1.json",
    "lexus-maintenance-required.v1.json",
    "nissan-fixed-interval.v1.json",
    "hyundai-fixed-interval.v1.json",
    "kia-fixed-interval.v1.json",
    "subaru-fixed-interval.v1.json",
    "mazda-fixed-interval.v1.json",
    "ford-olm.v1.json",
    "chevy-olm.v1.json",
    "ev-generic.v1.json",
  ];
  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(knowledgeRoot(), "aliases", file), "utf8")) as unknown;
    return validateServiceAliasBundle(raw);
  });
};

const supportedVehicleCatalog = supportedVehicleCatalogJson as SupportedVehicleCatalog;

export const loadSupportedVehicleCatalog = (): SupportedVehicleCatalog => supportedVehicleCatalog;

export const resolvePackIdForVehicle = (input: {
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain?: string;
}): string | null => {
  const catalog = loadSupportedVehicleCatalog();
  const normalized = (value: string): string => value.trim().toLowerCase();
  const trimTokens = (value: string): string[] =>
    normalized(value)
      .split(/[\s,/+-]+/)
      .filter(Boolean);

  const rankMatches = (
    matches: SupportedVehicleCatalog["vehicles"],
  ): string | null => {
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0].packId;

    const inputTrim = normalized(input.trim);
    const inputPowertrain = input.powertrain ? normalized(input.powertrain) : null;

    const ranked = [...matches].sort((a, b) => {
      const aTrim = normalized(a.trim);
      const bTrim = normalized(b.trim);
      const aExactTrim = aTrim === inputTrim ? 1 : 0;
      const bExactTrim = bTrim === inputTrim ? 1 : 0;
      if (aExactTrim !== bExactTrim) return bExactTrim - aExactTrim;

      const aPowertrainMatch =
        a.powertrain && (inputTrim.includes(normalized(a.powertrain)) || inputPowertrain === normalized(a.powertrain))
          ? 1
          : 0;
      const bPowertrainMatch =
        b.powertrain && (inputTrim.includes(normalized(b.powertrain)) || inputPowertrain === normalized(b.powertrain))
          ? 1
          : 0;
      if (aPowertrainMatch !== bPowertrainMatch) return bPowertrainMatch - aPowertrainMatch;

      if (a.qaStatus === "auto_verified" && b.qaStatus !== "auto_verified") return -1;
      if (b.qaStatus === "auto_verified" && a.qaStatus !== "auto_verified") return 1;
      if (a.supportTier === "tier1" && b.supportTier !== "tier1") return -1;
      if (b.supportTier === "tier1" && a.supportTier !== "tier1") return 1;
      return a.packId.length - b.packId.length;
    });

    return ranked[0]?.packId ?? null;
  };

  const exactMatches = catalog.vehicles.filter(
    (row) =>
      normalized(row.make) === normalized(input.make) &&
      normalized(row.model) === normalized(input.model) &&
      row.year === input.year &&
      normalized(row.trim) === normalized(input.trim) &&
      (!input.powertrain ||
        !row.powertrain ||
        normalized(row.powertrain) === normalized(input.powertrain)),
  );

  const exactPackId = rankMatches(exactMatches);
  if (exactPackId) return exactPackId;

  const inputTokens = trimTokens(input.trim);
  const compoundMatches = catalog.vehicles.filter((row) => {
    if (
      normalized(row.make) !== normalized(input.make) ||
      normalized(row.model) !== normalized(input.model) ||
      row.year !== input.year
    ) {
      return false;
    }

    const rowTrim = normalized(row.trim);
    if (inputTokens.includes(rowTrim)) return true;

    const rowTokens = trimTokens(row.trim);
    return rowTokens.length > 0 && rowTokens.every((token) => inputTokens.includes(token));
  });

  return rankMatches(compoundMatches);
};

export type KnowledgeScheduleDraftRow = {
  entryId: string;
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourcePage?: string;
  ruleId: string;
  canonicalServiceId?: string;
};

export const packToKnowledgeScheduleDraft = (
  pack: OemSchedulePack,
): KnowledgeScheduleDraftRow[] =>
  pack.entries
    .filter((entry) => entry.intervalMiles != null || entry.intervalMonths != null)
    .map((entry) => ({
      entryId: entry.entryId,
      serviceName: entry.serviceName,
      intervalMiles: entry.intervalMiles ?? undefined,
      intervalMonths: entry.intervalMonths ?? undefined,
      sourcePage: entry.sourcePage,
      ruleId: entry.ruleId,
      canonicalServiceId: entry.canonicalServiceId,
    }));

export const createRuntimeServiceAliasRegistry = () =>
  compileServiceAliasRegistry(loadServiceAliasBundles());
