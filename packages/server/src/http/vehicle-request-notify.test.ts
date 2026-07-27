import { describe, expect, it } from "vitest";
import { formatVehicleRequestOwnerConfirmationEmail } from "./vehicle-request-owner-email.js";
import { formatVehicleRequestOpsEmail } from "./vehicle-request-notify.js";

const samplePayload = {
  requestId: "req-123",
  createdAt: "2026-07-26T20:00:00.000Z",
  year: 2025,
  make: "Acura",
  model: "Integra",
  trim: "A-Spec",
  contactEmail: "abc@gmail.com",
  source: "marketing" as const,
};

describe("formatVehicleRequestOpsEmail", () => {
  it("includes vehicle, owner reply-to, and note", () => {
    const result = formatVehicleRequestOpsEmail({
      ...samplePayload,
      year: 2019,
      make: "Honda",
      model: "Civic",
      trim: "EX",
      contactEmail: "owner@example.com",
      note: "Daily driver",
    });

    expect(result.subject).toBe("VehicleOS request: 2019 Honda Civic EX");
    expect(result.text).toContain("Reply to owner: owner@example.com");
    expect(result.text).toContain("Source: marketing");
    expect(result.text).toContain("Daily driver");
  });
});

describe("formatVehicleRequestOwnerConfirmationEmail", () => {
  it("matches marketing success copy and includes html", () => {
    const result = formatVehicleRequestOwnerConfirmationEmail(samplePayload);

    expect(result.subject).toBe("Working on your request — 2025 Acura Integra A-Spec");
    expect(result.text).toContain("Got it — we're prioritizing your car.");
    expect(result.text).toContain("You asked — we're on it.");
    expect(result.text).toContain(
      "We'll email you when VehicleOS is ready with your car's official OEM maintenance schedule.",
    );
    expect(result.text).not.toContain("Request ID");
    expect(result.html).toContain("Got it — we're prioritizing your car.");
    expect(result.html).toContain("You asked — we're on it.");
    expect(result.html).toContain("when VehicleOS is ready with your car's official OEM maintenance schedule.");
    expect(result.html).not.toContain("Open VehicleOS");
  });
});
