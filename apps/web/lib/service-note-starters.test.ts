import { describe, expect, it } from "vitest";
import { recentServiceNoteStarters } from "./service-note-starters";

describe("recentServiceNoteStarters", () => {
  it("uses the latest unique owner-history labels without generating new services", () => {
    expect(
      recentServiceNoteStarters([
        { serviceDate: "2025-02-01", lineItems: ["Engine air filter"] },
        { serviceDate: "2026-08-01", lineItems: ["Rear brake pads", "rear brake pads", "Oil and filter changed"] },
      ]),
    ).toEqual(["Rear brake pads", "Engine air filter"]);
  });

  it("ignores malformed, empty, overly long, and default labels", () => {
    expect(
      recentServiceNoteStarters([
        { serviceDate: "2026-08-01", lineItems: ["", 42, "Tires rotated", "x".repeat(65), "Cabin filter"] },
      ]),
    ).toEqual(["Cabin filter"]);
  });
});
