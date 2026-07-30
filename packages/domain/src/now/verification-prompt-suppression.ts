import type { NowQueueItem } from "../projections/types.js";

/** Skip creating a verification prompt when one was already handled for this rule. */
export const hasHandledVerificationPromptForRule = (input: {
  nowQueue: NowQueueItem[];
  ruleId: string;
  today?: string;
}): boolean => {
  return input.nowQueue.some((item) => {
    if (item.taskKind !== "verification" || item.ruleId !== input.ruleId) return false;

    if (item.status === "pending") return true;
    return (
      item.status === "dismissed" ||
      item.status === "approved" ||
      item.status === "scheduled" ||
      item.status === "completed"
    );
  });
};
