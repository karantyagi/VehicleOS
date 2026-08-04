import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CarfaxImportReview, type CarfaxReviewRow } from "./carfax-import-review";

vi.mock("@/components/extraction-status-banner", () => ({
  ExtractionStatusBanner: () => null,
}));

const stateInspectionRow: CarfaxReviewRow = {
  id: "inspection-1",
  included: true,
  tier: "verify",
  tierReasons: ["State inspection record"],
  ownerGuidance: [
    {
      code: "state_inspection_record",
      title: "State inspection record",
      detail: "CARFAX identifies this as a Massachusetts inspection entry.",
      resolve: "Confirm it if you recognize the inspection.",
    },
  ],
  ownerReviewPhase: "active",
  shop: "Massachusetts",
  shopLocation: "Massachusetts",
  serviceDate: "2026-04-16",
  mileage: 56_221,
  lineItems: ["Passed safety inspection"],
  total: "$0.00",
  locationEvidence: {
    status: "state_record",
    message: "State record",
  },
};

describe("CarfaxImportReview", () => {
  it("shows source location evidence and blocks import until a flagged row is confirmed", () => {
    const markup = renderToStaticMarkup(
      <CarfaxImportReview
        vehicleLabel="2021 Acura TLX"
        summary={{ rows: [], autoCount: 0, enrichedCount: 0, verifyCount: 1, blockCount: 0, readyCount: 0 }}
        rows={[stateInspectionRow]}
        onRowChange={() => undefined}
        onConfirmReview={() => undefined}
        onAcceptAsReported={() => undefined}
        onIncludeAllReady={() => undefined}
        onExcludeAll={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(markup).toContain("State inspection record — no individual shop location supplied");
    expect(markup).toContain("Confirm 1 row first");
    expect(markup).toContain("I recognize this state inspection");
  });
});
