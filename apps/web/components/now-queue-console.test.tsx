import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { QueueItem } from "@/lib/console-types";
import { NowQueueConsole } from "./now-queue-console";

const importQuestion: QueueItem = {
  taskId: "import-question",
  title: "Confirm imported record",
  reason: "The source contains a record VehicleOS cannot safely trust without you.",
  status: "pending",
  taskKind: "verification",
  severity: "blocking",
  verificationCode: "VERIFY_IMPORT_ROW",
  target: {
    surface: "history",
    recordId: "service-1",
    field: "import_rows",
    label: "service history",
  },
};

describe("NowQueueConsole owner questions", () => {
  it("uses a context-specific safe question flow", () => {
    const markup = renderToStaticMarkup(
      <NowQueueConsole
        items={[importQuestion]}
        ownerSimple
        focusTaskId="import-question"
        onDecide={vi.fn()}
        onReviewTarget={vi.fn()}
      />,
    );

    expect(markup).toContain("Can you confirm this imported service record?");
    expect(markup).toContain("Verify");
    expect(markup).toContain("Yes, use this record");
    expect(markup).toContain("Keep it unconfirmed");
    expect(markup).toContain("Review later");
    expect(markup).toContain("Why am I being asked?");
    expect(markup).toContain("Review service history");
    expect(markup).not.toContain(">Confirm<");
    expect(markup).not.toContain("Keep existing");
  });
});
