import { describe, expect, it } from "vitest";
import { formatVehicleRequestOpsEmail } from "./vehicle-request-notify.js";

describe("formatVehicleRequestOpsEmail", () => {
  it("includes vehicle, owner reply-to, and note", () => {
    const result = formatVehicleRequestOpsEmail({
      requestId: "req-123",
      createdAt: "2026-07-26T20:00:00.000Z",
      year: 2019,
      make: "Honda",
      model: "Civic",
      trim: "EX",
      contactEmail: "owner@example.com",
      source: "marketing",
      note: "Daily driver",
    });

    expect(result.subject).toBe("VehicleOS request: 2019 Honda Civic EX");
    expect(result.text).toContain("Reply to owner: owner@example.com");
    expect(result.text).toContain("Source: marketing");
    expect(result.text).toContain("Daily driver");
  });
});
