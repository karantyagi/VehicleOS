import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResearchDeleteDialog } from "./research-cohort-page";
import type { ResearchImportRun } from "@/lib/research-import/types";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const run: ResearchImportRun = {
  id: "run-1",
  source: "carfax-pdf",
  status: "extracted",
  fileName: "2021-acura-tlx-carfax.pdf",
  createdAt: "2026-08-03T12:00:00.000Z",
  deleteAfter: "2026-09-02T12:00:00.000Z",
  textCharacterCount: 1_200,
  model: "gpt-5",
  promptVersion: "research-carfax-contract.v1",
  draft: null,
  ownerDraft: null,
  errorCode: null,
};

describe("ResearchDeleteDialog", () => {
  it("identifies the PDF and explains the deletion boundary before confirming", () => {
    const markup = renderToStaticMarkup(
      <ResearchDeleteDialog run={run} deleting={false} error={null} onOpenChange={() => undefined} onConfirm={() => undefined} />,
    );

    expect(markup).toContain("Delete this research PDF?");
    expect(markup).toContain("2021-acura-tlx-carfax.pdf");
    expect(markup).toContain("will not change your VehicleOS maintenance history");
    expect(markup).toContain("Keep PDF");
    expect(markup).toContain("Delete PDF");
  });
});
