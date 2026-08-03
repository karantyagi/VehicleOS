import type { OwnershipRecordEntry } from "../projections/types.js";

const MA_AGENCY_PATTERN = /massachusetts|myrmv|\brmv\b/i;

export const REGISTRATION_RENEWAL_MA_RULE_ID = "registration.renewal.ma.v1";
export const REGISTRATION_RENEWAL_GENERIC_RULE_ID = "renewal.policy.registration.v1";
export const INSPECTION_RENEWAL_RULE_ID = "renewal.policy.inspection.v1";
export const DRIVER_LICENSE_RENEWAL_RULE_ID = "renewal.policy.driver-license.v1";
export const OTHER_RENEWAL_RULE_ID = "renewal.policy.other.v1";

export const resolveRenewalRuleId = (input: {
  eventType: OwnershipRecordEntry["eventType"];
  agency?: string;
}): string => {
  if (input.eventType === "inspection") return INSPECTION_RENEWAL_RULE_ID;
  if (input.eventType === "license") return DRIVER_LICENSE_RENEWAL_RULE_ID;
  if (input.eventType === "registration") {
    if (input.agency && MA_AGENCY_PATTERN.test(input.agency)) {
      return REGISTRATION_RENEWAL_MA_RULE_ID;
    }
    return REGISTRATION_RENEWAL_GENERIC_RULE_ID;
  }
  return OTHER_RENEWAL_RULE_ID;
};

export const isRenewalRuleId = (ruleId: string | undefined): boolean =>
  Boolean(
    ruleId?.startsWith("renewal.policy.") || ruleId?.startsWith("registration.renewal."),
  );
