import vehicleIdentityAliasesJson from "../catalog/vehicle-identity-aliases.v1.json" with { type: "json" };
import { loadSupportedVehicleCatalog } from "./load-catalog.js";
import type {
  CanonicalVehicleIdentity,
  SupportedVehicleIdentityResolution,
  VehicleIdentityAliasRegistry,
} from "./types.js";

const vehicleIdentityAliases = vehicleIdentityAliasesJson as VehicleIdentityAliasRegistry;

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Resolve decoder vocabulary only through the reviewed alias registry. The
 * supported-vehicle catalog remains the source of truth for schedule access.
 */
export const resolveCanonicalVehicleIdentity = (input: {
  source: "nhtsa_vpic";
  make: string;
  model: string;
  year: number;
}): CanonicalVehicleIdentity | null => {
  if (!Number.isInteger(input.year) || input.year < 1886 || !input.make.trim() || !input.model.trim()) {
    return null;
  }

  const alias = vehicleIdentityAliases.aliases.find(
    (entry) =>
      entry.source === input.source &&
      normalize(entry.externalMake) === normalize(input.make) &&
      normalize(entry.externalModel) === normalize(input.model),
  );
  if (!alias) return null;

  return {
    make: alias.canonicalMake,
    model: alias.canonicalModel,
    year: input.year,
  };
};

/**
 * Find the reviewed schedules compatible with a decoded vehicle identity.
 * Trim and powertrain intentionally remain a separate owner choice.
 */
export const resolveSupportedVehicleIdentity = (input: {
  source: "nhtsa_vpic";
  make: string;
  model: string;
  year: number;
}): SupportedVehicleIdentityResolution => {
  const canonical = resolveCanonicalVehicleIdentity(input);
  if (!canonical) return { canonical: null, candidates: [] };

  const candidates = loadSupportedVehicleCatalog().vehicles.filter(
    (row) =>
      row.qaStatus === "auto_verified" &&
      row.year === canonical.year &&
      normalize(row.make) === normalize(canonical.make) &&
      normalize(row.model) === normalize(canonical.model),
  );

  return { canonical, candidates };
};
