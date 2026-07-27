export const INTERVAL_RULE_PREFIX = "interval.policy.";
export const INTERVAL_RULE_SUFFIX = ".v1";

export const intervalRuleIdForEntry = (entryId: string): string =>
  `${INTERVAL_RULE_PREFIX}${entryId}${INTERVAL_RULE_SUFFIX}`;

export const parseIntervalRuleEntryId = (ruleId: string | undefined | null): string | null => {
  if (!ruleId?.startsWith(INTERVAL_RULE_PREFIX) || !ruleId.endsWith(INTERVAL_RULE_SUFFIX)) {
    return null;
  }

  const entryId = ruleId.slice(INTERVAL_RULE_PREFIX.length, -INTERVAL_RULE_SUFFIX.length);
  return entryId.length > 0 ? entryId : null;
};
