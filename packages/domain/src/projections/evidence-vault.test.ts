import { describe, expect, it } from "vitest";
import { EVENT_TYPES, EVENT_VERSIONS } from "../events/catalog.js";
import { foldEvents } from "./apply.js";

describe("evidence vault projection", () => {
  it("records immutable document.ingested artifacts", () => {
    const vehicleId = "veh-1";
    const state = foldEvents(vehicleId, [
      {
        id: "evt-1",
        aggregateType: "document",
        aggregateId: "doc-1",
        eventType: EVENT_TYPES.DOCUMENT_INGESTED,
        eventVersion: EVENT_VERSIONS[EVENT_TYPES.DOCUMENT_INGESTED],
        payload: {
          vehicleId,
          documentId: "doc-1",
          channel: "photo",
          storageKey: "user-1/veh-1/receipt.jpg",
        },
        createdAt: "2026-01-12T10:00:00.000Z",
      },
    ]);

    expect(state.evidenceVault).toHaveLength(1);
    expect(state.evidenceVault[0]).toMatchObject({
      documentId: "doc-1",
      storageKey: "user-1/veh-1/receipt.jpg",
      channel: "photo",
      immutable: true,
    });
  });
});
