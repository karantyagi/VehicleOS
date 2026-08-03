export const ONBOARDING_BASELINE_RULE_ID = "schedule.policy.onboarding.v1";

export const ONBOARDING_BASELINE_TITLE = "Log your first service";

export const ONBOARDING_BASELINE_REASON =
  "Add one completed service to personalize future maintenance recommendations.";

export const ONBOARDING_BASELINE_DEADLINE_LABEL = "Set your maintenance baseline";

export const isOnboardingBaselineRule = (ruleId: string | undefined): boolean =>
  ruleId === ONBOARDING_BASELINE_RULE_ID;
