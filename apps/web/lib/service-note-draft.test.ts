import { describe, expect, it } from "vitest";
import { parseServiceNoteDraft, serviceNoteDraftStorageKey } from "./service-note-draft";

describe("service note draft storage", () => {
  it("scopes a draft to one vehicle and the current draft format", () => {
    expect(serviceNoteDraftStorageKey("vehicle-123")).toBe("vehicleos:service-note-draft:v1:vehicle-123");
  });

  it("accepts a complete draft", () => {
    expect(
      parseServiceNoteDraft('{"text":"Oil changed","serviceDate":"2026-08-07","mileage":62200}'),
    ).toEqual({ text: "Oil changed", serviceDate: "2026-08-07", mileage: 62200 });
  });

  it.each([null, "not-json", '{"text":"","serviceDate":"2026-08-07","mileage":62200}', '{"text":"Oil changed","mileage":62200}'])(
    "ignores malformed or incomplete browser data: %s",
    (value) => {
      expect(parseServiceNoteDraft(value)).toBeNull();
    },
  );
});
