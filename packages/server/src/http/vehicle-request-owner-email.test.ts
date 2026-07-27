import { describe, expect, it } from "vitest";
import { formatVehicleRequestOwnerConfirmationEmail } from "./vehicle-request-owner-email.js";

describe("formatVehicleRequestOwnerConfirmationEmail html safety", () => {
  it("escapes html in user-provided fields", () => {
    const result = formatVehicleRequestOwnerConfirmationEmail({
      requestId: "req-123",
      createdAt: "2026-07-26T20:00:00.000Z",
      year: 2025,
      make: "Acura<script>",
      model: "Integra",
      trim: "A-Spec",
      contactEmail: "test@example.com",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("Acura&lt;script&gt;");
  });
});
