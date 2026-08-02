import { describe, expect, it } from "vitest";
import {
  isVisitOnlyServiceRecord,
  maintenanceServiceHistory,
  resolveServiceRecordKind,
  stripGenericCarfaxVisitLineItems,
} from "./service-record-kind.js";

describe("service record kind", () => {
  it("keeps a generic CARFAX visit visible without treating it as completed service", () => {
    const visit = { source: "carfax_import" as const, lineItems: ["Service visit"] };

    expect(resolveServiceRecordKind(visit)).toBe("visit_only");
    expect(isVisitOnlyServiceRecord(visit)).toBe(true);
    expect(maintenanceServiceHistory([visit])).toEqual([]);
  });

  it("removes a generic CARFAX marker when the actual work is present", () => {
    expect(stripGenericCarfaxVisitLineItems(["Service visit", "Oil change"])).toEqual([
      "Oil change",
    ]);
    expect(resolveServiceRecordKind({ source: "carfax_import", lineItems: ["Oil change"] })).toBe(
      "service",
    );
  });
});
