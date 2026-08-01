import { describe, expect, it } from "vitest";
import type { OwnerHistoryItem } from "@vehicleos/domain";
import { filterOwnerHistoryItems } from "./owner-history-filter";

const items: OwnerHistoryItem[] = [
  { id: "service-1", kind: "service", date: "2026-07-02", mileage: 20_000, lineItems: ["Oil change"] },
  { id: "ownership-1", kind: "ownership", date: "2026-06-20", mileage: null, lineItems: ["Registration renewed"] },
  { id: "service-2", kind: "service", date: "2025-12-08", mileage: 15_000, lineItems: ["Tire rotation"] },
];

describe("filterOwnerHistoryItems", () => {
  it("keeps the timeline order when limiting to service records", () => {
    expect(filterOwnerHistoryItems(items, "service").map((item) => item.id)).toEqual(["service-1", "service-2"]);
  });

  it("limits the timeline to ownership events", () => {
    expect(filterOwnerHistoryItems(items, "ownership").map((item) => item.id)).toEqual(["ownership-1"]);
  });

  it("leaves every record visible for the default filter", () => {
    expect(filterOwnerHistoryItems(items, "all")).toBe(items);
  });
});
