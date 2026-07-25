import { mkdirSync, writeFileSync } from "node:fs";
import type { ExtractMismatch } from "./dual-extract/types.js";
import { workspaceReviewQueueRoot } from "./paths.js";

export type ReviewQueueInput = {
  packId: string;
  mismatches: ExtractMismatch[];
  qaIssues: string[];
  pdfMissing?: boolean;
  triedUrls?: string[];
  dualExtractAgree?: boolean;
  notes?: string[];
};

export const writeReviewQueue = (input: ReviewQueueInput): string => {
  mkdirSync(workspaceReviewQueueRoot, { recursive: true });
  const path = `${workspaceReviewQueueRoot}/${input.packId}.md`;

  const lines: string[] = [
    `# Review queue — \`${input.packId}\``,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Status",
    "",
  ];

  if (input.pdfMissing) {
    lines.push("- **Blocked:** OEM PDF not downloaded — add URL to registry or place PDF manually.");
    if (input.triedUrls?.length) {
      lines.push("", "Tried URLs:", ...input.triedUrls.map((url) => `- ${url}`));
    }
  } else if (input.dualExtractAgree) {
    lines.push("- **Dual-extract:** ✅ Pass A and Pass B agree");
  } else {
    lines.push("- **Dual-extract:** ❌ Mismatch — creator resolution required (Phase C)");
  }

  if (input.qaIssues.length > 0) {
    lines.push("", "## QA rule failures", "", ...input.qaIssues.map((issue) => `- ${issue}`));
  }

  if (input.mismatches.length > 0) {
    lines.push("", "## Dual-extract mismatches", "");
    for (const mismatch of input.mismatches) {
      lines.push(`### ${mismatch.rowKey}`, "", `- Issue: ${mismatch.issue}`);
      if (mismatch.passA) {
        lines.push(
          `- Agent A: ${mismatch.passA.intervalMiles ?? "—"} mi / ${mismatch.passA.intervalMonths ?? "—"} mo — \`${mismatch.passA.sourcePage}\``,
        );
      }
      if (mismatch.passB) {
        lines.push(
          `- Agent B: ${mismatch.passB.intervalMiles ?? "—"} mi / ${mismatch.passB.intervalMonths ?? "—"} mo — \`${mismatch.passB.sourcePage}\``,
        );
      }
      lines.push("");
    }
  }

  if (input.notes?.length) {
    lines.push("## Notes", "", ...input.notes.map((note) => `- ${note}`));
  }

  lines.push("", "## Phase C action", "", "- [ ] Resolve mismatches or defer pack", "- [ ] Promote to `auto_verified` when B1–B5 pass", "");

  writeFileSync(path, lines.join("\n"), "utf8");
  return path;
};
