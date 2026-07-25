export type ManualScheduleImportEntry = {
  serviceName: string;
  intervalMiles?: number;
  intervalMonths?: number;
  sourcePage?: string;
};

export type ManualScheduleImportV1 = {
  version: "1";
  source: string;
  exportedAt?: string;
  manualTitle: string;
  storageKey?: string;
  entries: ManualScheduleImportEntry[];
};

export const parseManualScheduleImportJson = (
  raw: string,
): { ok: true; data: ManualScheduleImportV1 } | { ok: false; error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON — check formatting and try again." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Import file must be a JSON object." };
  }

  const data = parsed as Partial<ManualScheduleImportV1>;
  if (data.version !== "1") {
    return { ok: false, error: 'Import file must include "version": "1".' };
  }
  if (!data.manualTitle?.trim()) {
    return { ok: false, error: "manualTitle is required." };
  }
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    return { ok: false, error: "entries must include at least one schedule row." };
  }

  for (const [index, entry] of data.entries.entries()) {
    if (!entry?.serviceName?.trim()) {
      return { ok: false, error: `entries[${index}].serviceName is required.` };
    }
  }

  return { ok: true, data: data as ManualScheduleImportV1 };
};
