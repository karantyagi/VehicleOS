export function formatRuleLineage(ruleId?: string): { label: string; detail: string } {
  if (!ruleId) {
    return { label: "Manual action", detail: "Created from your input — not tied to an automated policy id." };
  }
  if (ruleId.startsWith("seasonal.policy.")) {
    return { label: "Seasonal policy", detail: ruleId.replace("seasonal.policy.", "Rule · ") };
  }
  if (ruleId.startsWith("knowledge.policy.")) {
    return { label: "OEM knowledge", detail: ruleId.replace("knowledge.policy.", "Rule · ") };
  }
  if (ruleId.startsWith("schedule.policy.")) {
    return { label: "Maintenance schedule", detail: ruleId.replace("schedule.policy.", "Rule · ") };
  }
  if (ruleId.startsWith("conflict.")) {
    return { label: "Verification", detail: ruleId };
  }
  return { label: "Policy rule", detail: ruleId };
}
