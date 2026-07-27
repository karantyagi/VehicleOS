import type { MaintenanceDeviationReasonId } from "./deviation-reason-options.js";
import { maintenanceDeviationReasonLabel } from "./deviation-reason-options.js";
import type { OwnerContextMemory } from "./types.js";
import type { DrivingStyle } from "../schedule/resolve-schedule-projection-context.js";
import type { MaintenanceDeviationRecord } from "../schedule/project-maintenance-deviations.js";
import type { ServiceTimelineEntry } from "../projections/types.js";

export type DraftDeviationReasonInput = {
  deviation: MaintenanceDeviationRecord;
  ownerContextMemory?: OwnerContextMemory | null;
  drivingStyle?: DrivingStyle | null;
  timeline: ServiceTimelineEntry[];
};

export type DraftDeviationReasonResult = {
  suggestedReasonId: MaintenanceDeviationReasonId;
  draftSummary: string;
  /** Heuristic rules today — swap for LLM via engine port (SCH-5b / ENG-2). */
  source: "heuristic" | "llm";
  confidence: number;
};

const NORTHEAST_CITY_PATTERN =
  /\b(boston|cambridge|somerville|worcester|providence|hartford|manchester|portland|burlington|albany|new york|nyc|brooklyn|philadelphia|pittsburgh)\b/i;

const isWearItem = (serviceName: string): boolean =>
  /brake|tire|pad|rotor|suspension|alignment|fluid|filter|oil/i.test(serviceName);

const timelineNotesForDeviation = (
  timeline: ServiceTimelineEntry[],
  serviceName: string,
): string[] => {
  const normalized = serviceName.toLowerCase();
  return timeline.flatMap((entry) =>
    entry.lineItems.filter((line) => {
      const lower = line.toLowerCase();
      return (
        lower.includes(normalized.split(",")[0]?.trim() ?? normalized) ||
        (normalized.includes("brake") && /brake|pad|rotor/i.test(lower)) ||
        (normalized.includes("oil") && /oil|lube/i.test(lower))
      );
    }),
  );
};

export const heuristicDraftDeviationReason = (
  input: DraftDeviationReasonInput,
): DraftDeviationReasonResult => {
  const context = input.ownerContextMemory ?? {};
  const notes = timelineNotesForDeviation(input.timeline, input.deviation.serviceName).join(" ").toLowerCase();
  const city = context.primaryCity ?? "";
  const climate = (context.climateNotes ?? []).join(" ").toLowerCase();
  const isNortheast = NORTHEAST_CITY_PATTERN.test(city) || /salt|winter|snow|ice|corrosion|rust/i.test(climate);
  const wearItem = isWearItem(input.deviation.serviceName);

  if (input.deviation.oemTiming === "late") {
    return {
      suggestedReasonId: "deferred_intentionally",
      draftSummary: "Looks like this service ran later than the OEM interval — often deferred on purpose.",
      source: "heuristic",
      confidence: 0.72,
    };
  }

  if (/noise|squeal|grind|vibrat|symptom|leak/i.test(notes)) {
    return {
      suggestedReasonId: "noise_symptom",
      draftSummary: "Service notes mention noise or symptoms — that often explains acting before the OEM interval.",
      source: "heuristic",
      confidence: 0.86,
    };
  }

  if (wearItem && isNortheast && /brake|pad|rotor/i.test(input.deviation.serviceName)) {
    return {
      suggestedReasonId: "winter_salt",
      draftSummary: `Driving in ${city || "a northeast market"} — winter road salt often pulls brake work earlier.`,
      source: "heuristic",
      confidence: 0.84,
    };
  }

  if (input.drivingStyle === "aggressive" && wearItem) {
    return {
      suggestedReasonId: "aggressive_driving",
      draftSummary: "Sporty driving profile plus wear-item timing — aggressive use often moves service earlier.",
      source: "heuristic",
      confidence: 0.78,
    };
  }

  if (input.deviation.baselineSource === "carfax" || /dealer|recommended|inspection/i.test(notes)) {
    return {
      suggestedReasonId: "dealer_recommended",
      draftSummary: "History shows shop or dealer involvement — they may have recommended acting early.",
      source: "heuristic",
      confidence: 0.74,
    };
  }

  if (wearItem && input.deviation.oemTiming === "early") {
    return {
      suggestedReasonId: "noise_symptom",
      draftSummary: "Wear item done early — noise or wear symptoms are the most common owner reason.",
      source: "heuristic",
      confidence: 0.65,
    };
  }

  return {
    suggestedReasonId: "other",
    draftSummary: "Timing differed from OEM — pick the reason that fits, or explain later.",
    source: "heuristic",
    confidence: 0.5,
  };
};

export const formatDraftDeviationTaskReason = (input: {
  deviation: MaintenanceDeviationRecord;
  draft: DraftDeviationReasonResult;
}): string => {
  const timing =
    input.deviation.oemTiming === "early" ? "earlier than the OEM interval" : "later than the OEM interval";
  const label = maintenanceDeviationReasonLabel(input.draft.suggestedReasonId);
  return `Your history shows this service was done ${timing}. Assistant suggestion: ${label} — ${input.draft.draftSummary} Confirm or pick another reason.`;
};
