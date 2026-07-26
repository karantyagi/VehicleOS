import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { Tier2000OemFamily, Tier2000PackSpec, Tier2000ScheduleKind, Tier2000SourceRow } from "./tier2000-types.js";

const registryRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../sources/registries/tier-2000",
);

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
};

const readCsv = (filename: string): Record<string, string>[] => {
  const raw = readFileSync(join(registryRoot, filename), "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, (cells[index] ?? "").trim()]));
  });
};

const asOemFamily = (value: string): Tier2000OemFamily => value as Tier2000OemFamily;
const asScheduleKind = (value: string): Tier2000ScheduleKind => value as Tier2000ScheduleKind;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Fix Codex rows where powertrain slug was appended twice (e.g. sh-awd-sh-awd). */
export const normalizeTier2000PackId = (input: {
  packId: string;
  trim: string;
  powertrain?: string;
}): string => {
  const trimSlug = slugify(input.trim);
  const powertrainSlug = input.powertrain ? slugify(input.powertrain) : "";
  if (!powertrainSlug || trimSlug !== powertrainSlug) return input.packId;
  const duplicateSuffix = `-${powertrainSlug}-${powertrainSlug}`;
  if (input.packId.endsWith(duplicateSuffix)) {
    return input.packId.slice(0, -(`-${powertrainSlug}`).length);
  }
  return input.packId;
};

export const loadTier2000PackTargets = (): Tier2000PackSpec[] =>
  readCsv("tier-2000-pack-targets.csv").map((row) => {
    const trim = row.trim;
    const powertrain = row.powertrain || undefined;
    const packId = normalizeTier2000PackId({
      packId: row.pack_id,
      trim,
      powertrain,
    });

    return {
      packId,
      make: row.make,
      model: row.model,
      year: Number.parseInt(row.year, 10),
      trim,
      powertrain,
      oemFamily: asOemFamily(row.oem_family),
      scheduleKind: asScheduleKind(row.schedule_kind),
      segment: row.segment || undefined,
      priority: Number.parseInt(row.priority, 10),
      manualSharePolicy: row.manual_share_policy || undefined,
    };
  });

const mapSourceCsvRow = (row: Record<string, string>): Tier2000SourceRow => {
  const trim = row.trim;
  const powertrain = row.powertrain || undefined;
  const packId = normalizeTier2000PackId({
    packId: row.pack_id,
    trim,
    powertrain,
  });

  return {
    packId,
    sourceTier: (row.source_tier || "") as Tier2000SourceRow["sourceTier"],
    primaryPdfUrl: row.primary_pdf_url,
    alternatePdfUrls: row.alternate_pdf_urls
      ? row.alternate_pdf_urls.split("|").map((url) => url.trim()).filter(Boolean)
      : [],
    confidence: Number.parseFloat(row.confidence || "0"),
    manualShareApplied: row.manual_share_applied?.toLowerCase() === "yes",
    sharedFromPackId: row.shared_from_pack_id || "",
    maintenanceSectionTitle: row.maintenance_section_title || "",
    blockedReason: row.blocked_reason || "",
  };
};

export const loadTier2000SourceRegistryV1 = (): Tier2000SourceRow[] =>
  readCsv("tier-2000-oem-manual-sources.csv").map(mapSourceCsvRow);

/** Targeted in-review retry registry — v2 rows override v1 for the same pack_id. */
export const loadTier2000SourceRegistryV2 = (): Tier2000SourceRow[] => {
  const path = join(registryRoot, "tier-2000-oem-manual-sources-v2.csv");
  if (!existsSync(path)) return [];
  return readCsv("tier-2000-oem-manual-sources-v2.csv").map(mapSourceCsvRow);
};

/** Tier D re-discovery registry — v3 rows override v2/v1 for the same pack_id. */
export const loadTier2000SourceRegistryV3 = (): Tier2000SourceRow[] => {
  const path = join(registryRoot, "tier-2000-oem-manual-sources-v3.csv");
  if (!existsSync(path)) return [];
  return readCsv("tier-2000-oem-manual-sources-v3.csv").map(mapSourceCsvRow);
};

export const loadTier2000SourceRegistry = (): Tier2000SourceRow[] => {
  const byPackId = new Map<string, Tier2000SourceRow>();
  for (const row of loadTier2000SourceRegistryV1()) {
    byPackId.set(row.packId, row);
  }
  for (const row of loadTier2000SourceRegistryV2()) {
    byPackId.set(row.packId, row);
  }
  for (const row of loadTier2000SourceRegistryV3()) {
    byPackId.set(row.packId, row);
  }
  return [...byPackId.values()];
};

export const loadTier2000SourceByPackId = (): Map<string, Tier2000SourceRow> => {
  const map = new Map<string, Tier2000SourceRow>();
  for (const row of loadTier2000SourceRegistry()) {
    map.set(row.packId, row);
  }
  return map;
};

export const tier2000RegistryRoot = registryRoot;
