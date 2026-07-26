import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadTier2000PackTargets,
  loadTier2000SourceByPackId,
  tier2000RegistryRoot,
} from "../factory/load-tier2000-registry.js";
import { loadSupportedVehicleCatalog } from "../load-catalog.js";
import { loadSourceManifest } from "../factory/manifest.js";

const escapeCsv = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const main = () => {
  const catalog = loadSupportedVehicleCatalog();
  const sources = loadTier2000SourceByPackId();
  const manifest = loadSourceManifest();
  const targetsByPackId = new Map(loadTier2000PackTargets().map((row) => [row.packId, row]));

  const tierD = catalog.vehicles.filter(
    (row) =>
      row.qaStatus === "creator_review_required" &&
      sources.get(row.packId)?.sourceTier === "D",
  );

  const blocked = catalog.vehicles.filter((row) => {
    if (row.qaStatus === "auto_verified") return false;
    const man = manifest.packs[row.packId];
    const src = sources.get(row.packId);
    return (
      (src?.sourceTier === "B" || src?.sourceTier === "C") &&
      man &&
      !man.localPdfPaths?.length &&
      man.notes?.toLowerCase().includes("blocked")
    );
  });

  const packIds = [...new Set([...tierD, ...blocked].map((row) => row.packId))].sort(
    (a, b) => {
      const priorityA = targetsByPackId.get(a)?.priority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = targetsByPackId.get(b)?.priority ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b);
    },
  );

  const header =
    "priority,pack_id,year,make,model,trim,powertrain,oem_family,schedule_kind,segment,manual_share_policy,retry_kind,v1_blocked_reason\n";
  const body = packIds
    .map((packId) => {
      const row = catalog.vehicles.find((vehicle) => vehicle.packId === packId)!;
      const target = targetsByPackId.get(packId);
      const src = sources.get(packId);
      const kind = src?.sourceTier === "D" ? "tier_d" : "url_blocked";
      return [
        String(target?.priority ?? ""),
        row.packId,
        String(row.year),
        row.make,
        row.model,
        row.trim,
        row.powertrain ?? "",
        target?.oemFamily ?? "",
        target?.scheduleKind ?? "",
        target?.segment ?? "",
        target?.manualSharePolicy ?? "",
        kind,
        src?.blockedReason ?? "",
      ]
        .map((cell) => escapeCsv(cell))
        .join(",");
    })
    .join("\n");

  const outPath = join(tier2000RegistryRoot, "tier-2000-tier-d-retry.csv");
  writeFileSync(outPath, `${header}${body}\n`);
  console.log(
    `Wrote ${packIds.length} rows (${tierD.length} Tier D + ${blocked.length} blocked) to ${outPath}`,
  );
};

main();
