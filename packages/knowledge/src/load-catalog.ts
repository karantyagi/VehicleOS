import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { OemSchedulePack, ServiceAliasBundle, SupportedVehicleCatalog } from "./types.js";
import { validateOemSchedulePack, validateServiceAliasBundle } from "./validate-pack.js";

const require = createRequire(import.meta.url);

const resolveKnowledgePackageRoot = (): string => {
  try {
    return dirname(require.resolve("@vehicleos/knowledge/package.json"));
  } catch {
    return join(dirname(fileURLToPath(import.meta.url)), "..");
  }
};

const packageRoot = resolveKnowledgePackageRoot();

export const loadOemSchedulePack = (packId: string): OemSchedulePack => {
  const path = join(packageRoot, "packs", `${packId}.v1.json`);
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
    const raw = JSON.parse(readFileSync(join(packageRoot, "aliases", file), "utf8")) as unknown;
    return validateServiceAliasBundle(raw);
  });
};

export const loadSupportedVehicleCatalog = (): SupportedVehicleCatalog => {
  const raw = JSON.parse(
    readFileSync(join(packageRoot, "catalog", "supported-vehicles.v1.json"), "utf8"),
  ) as SupportedVehicleCatalog;
  return raw;
};

export const resolvePackIdForVehicle = (input: {
  make: string;
  model: string;
  year: number;
  trim: string;
  powertrain?: string;
}): string | null => {
  const catalog = loadSupportedVehicleCatalog();
  const normalized = (value: string): string => value.trim().toLowerCase();
  const match = catalog.vehicles.find(
    (row) =>
      normalized(row.make) === normalized(input.make) &&
      normalized(row.model) === normalized(input.model) &&
      row.year === input.year &&
      normalized(row.trim) === normalized(input.trim) &&
      (!input.powertrain ||
        !row.powertrain ||
        normalized(row.powertrain) === normalized(input.powertrain)),
  );
  return match?.packId ?? null;
};

export type KnowledgeScheduleDraftRow = {
  entryId: string;
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourcePage?: string;
  ruleId: string;
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
    }));
