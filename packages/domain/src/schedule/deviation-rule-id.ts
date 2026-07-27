export const DEVIATION_RULE_PREFIX = "deviation.policy.";
export const DEVIATION_RULE_SUFFIX = ".v1";

export const deviationRuleIdForEntry = (entryId: string): string =>
  `${DEVIATION_RULE_PREFIX}${entryId}${DEVIATION_RULE_SUFFIX}`;

export const parseDeviationRuleEntryId = (ruleId: string | undefined | null): string | null => {
  if (!ruleId?.startsWith(DEVIATION_RULE_PREFIX) || !ruleId.endsWith(DEVIATION_RULE_SUFFIX)) {
    return null;
  }

  const entryId = ruleId.slice(DEVIATION_RULE_PREFIX.length, -DEVIATION_RULE_SUFFIX.length);
  return entryId.length > 0 ? entryId : null;
};
