import type { NowQueueItem } from "../projections/types.js";

/** Skip creating a verification prompt when one was already handled for this rule. */
export const hasHandledVerificationPromptForRule = (input: {
  nowQueue: NowQueueItem[];
  ruleId: string;
  today?: string;
}): boolean => {
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  return input.nowQueue.some((item) => {
    if (item.taskKind !== "verification" || item.ruleId !== input.ruleId) return false;

    if (item.status === "pending") return true;
    if (item.status === "dismissed" || item.status === "approved") return true;

    if (item.status === "snoozed") {
      if (!item.snoozeUntil) return true;
      return item.snoozeUntil >= today;
    }

    return false;
  });
};
