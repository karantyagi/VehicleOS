import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSourceManifest } from "./manifest.js";
import { packJsonPath } from "./paths.js";
import { loadOemSchedulePack, loadSupportedVehicleCatalog } from "../load-catalog.js";
import { runPackQaRules, validateOemSchedulePack } from "../validate-pack.js";
import type { OemSchedulePack, SupportedVehicleCatalog } from "../types.js";

const catalogPath = join(dirname(fileURLToPath(import.meta.url)), "../../catalog/supported-vehicles.v1.json");

export type PromotePackResult =
  | { ok: true; packId: string; qaStatus: "auto_verified" }
  | { ok: false; packId: string; reason: string };

export const promotePackToAutoVerified = (packId: string): PromotePackResult => {
  const manifest = loadSourceManifest();
  const manifestEntry = manifest.packs[packId];

  if (!manifestEntry?.dualExtractAgree) {
    return { ok: false, packId, reason: "manifest missing dualExtractAgree:true" };
  }

  const pack = loadOemSchedulePack(packId);
  const qaIssues = runPackQaRules(pack);
  if (qaIssues.length > 0) {
    return { ok: false, packId, reason: qaIssues.join("; ") };
  }

  const promoted: OemSchedulePack = {
    ...pack,
    qaStatus: "auto_verified",
    qaNotes: "Factory verified — Phase A+B dual-extract agree, QA rules pass (automated Phase C).",
  };

  validateOemSchedulePack(promoted);
  writeFileSync(packJsonPath(packId), `${JSON.stringify(promoted, null, 2)}\n`, "utf8");

  return { ok: true, packId, qaStatus: "auto_verified" };
};

export const syncCatalogQaFromPacks = (): { updated: number; catalog: SupportedVehicleCatalog } => {
  const catalog = loadSupportedVehicleCatalog();
  let updated = 0;

  const vehicles = catalog.vehicles.map((row) => {
    const pack = loadOemSchedulePack(row.packId);
    if (pack.qaStatus === row.qaStatus) return row;
    updated += 1;
    return { ...row, qaStatus: pack.qaStatus };
  });

  const nextCatalog: SupportedVehicleCatalog = { version: catalog.version, vehicles };
  writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, "utf8");
  return { updated, catalog: nextCatalog };
};
