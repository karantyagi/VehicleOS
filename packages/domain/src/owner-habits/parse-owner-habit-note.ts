import { OWNER_HABIT_DEFINITIONS } from "../schedule/owner-habit-definitions.js";
import type { OwnerHabitCaptureChannel, OwnerHabitProposalV1 } from "./types.js";

const MILES_PATTERN = /(?:every|each)\s+(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?k?)\s*(?:mi|miles)\b/i;
const MONTHS_PATTERN = /(?:every|each)\s+(\d{1,2})\s*(?:mo|month|months)\b/i;

const parseMiles = (raw: string): number => {
  const normalized = raw.replace(/,/g, "").toLowerCase();
  return normalized.endsWith("k")
    ? Math.round(Number.parseFloat(normalized.slice(0, -1)) * 1_000)
    : Math.round(Number.parseFloat(normalized));
};

export const validateOwnerHabitProposal = (proposal: OwnerHabitProposalV1): string | null => {
  if (proposal.version !== "1") return 'Owner habit proposal must use version "1".';
  if (!OWNER_HABIT_DEFINITIONS.some((definition) => definition.entryId === proposal.entryId)) {
    return "This owner habit is not supported yet.";
  }
  if (proposal.intervalMiles === null && proposal.intervalMonths === null) {
    return "Include how often you want to do this habit.";
  }
  if (proposal.intervalMiles !== null && (proposal.intervalMiles < 250 || proposal.intervalMiles > 100_000)) {
    return "Mileage interval must be between 250 and 100,000 miles.";
  }
  if (proposal.intervalMonths !== null && (proposal.intervalMonths < 1 || proposal.intervalMonths > 60)) {
    return "Time interval must be between 1 and 60 months.";
  }
  if (!proposal.sourceText.trim()) return "Source text is required.";
  if (proposal.confidence < 0 || proposal.confidence > 1) return "Confidence must be between 0 and 1.";
  return null;
};

export const parseOwnerHabitNote = (input: {
  text: string;
  captureChannel: OwnerHabitCaptureChannel;
}): OwnerHabitProposalV1 | null => {
  const sourceText = input.text.trim();
  if (!sourceText) return null;

  const habit = OWNER_HABIT_DEFINITIONS.find((definition) => definition.lineItemPattern.test(sourceText));
  if (!habit) return null;

  const milesMatch = sourceText.match(MILES_PATTERN);
  const monthsMatch = sourceText.match(MONTHS_PATTERN);
  const intervalMiles = milesMatch?.[1] ? parseMiles(milesMatch[1]) : null;
  const intervalMonths = monthsMatch?.[1] ? Number.parseInt(monthsMatch[1], 10) : null;
  if (intervalMiles === null && intervalMonths === null) return null;

  const proposal: OwnerHabitProposalV1 = {
    version: "1",
    entryId: habit.entryId,
    serviceName: habit.serviceName,
    intervalMiles,
    intervalMonths,
    basis: intervalMiles !== null && intervalMonths !== null ? "mixed" : intervalMiles !== null ? "mileage" : "time",
    captureChannel: input.captureChannel,
    extractionMethod: "rules",
    sourceText,
    confidence: 0.92,
  };

  return validateOwnerHabitProposal(proposal) ? null : proposal;
};
