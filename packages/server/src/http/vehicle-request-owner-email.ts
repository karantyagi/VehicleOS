import type { VehicleRequestOpsPayload } from "./vehicle-request-types.js";

const MARKETING_URL = process.env.VEHICLEOS_MARKETING_URL?.trim() ?? "https://vehicleos.app";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const formatVehicleLabel = (payload: Pick<VehicleRequestOpsPayload, "year" | "make" | "model" | "trim">): string =>
  `${payload.year} ${payload.make} ${payload.model} ${payload.trim}`;

export const formatVehicleRequestOwnerConfirmationEmail = (
  payload: VehicleRequestOpsPayload,
): { subject: string; text: string; html: string } => {
  const vehicle = formatVehicleLabel(payload);
  const email = payload.contactEmail.trim();
  const subject = `Working on your request — ${vehicle}`;

  const text = [
    "Got it — we're prioritizing your car.",
    "",
    "You asked — we're on it.",
    "",
    vehicle,
    "",
    `We'll email ${email} when VehicleOS is ready for your car.`,
    "",
    "— VehicleOS",
  ].join("\n");

  const safeVehicle = escapeHtml(vehicle);
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#fafafa;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Got it — we're prioritizing your ${safeVehicle}. We'll email ${safeEmail} when VehicleOS is ready for your car.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#131316;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
          <tr>
            <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                <tr>
                  <td style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#22c55e,#16a34a);text-align:center;vertical-align:middle;">
                    <span style="font-size:16px;line-height:32px;color:#04140b;">✓</span>
                  </td>
                  <td style="padding-left:10px;font-size:14px;font-weight:600;letter-spacing:-0.02em;color:#fafafa;">VehicleOS</td>
                </tr>
              </table>
              <h1 style="margin:0 0 10px;font-size:26px;line-height:1.3;font-weight:600;letter-spacing:-0.03em;color:#fafafa;">
                Got it — we're prioritizing your car.
              </h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#a1a1aa;">
                You asked — we're on it.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.22);border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-size:18px;line-height:1.35;font-weight:600;color:#fafafa;">
                    ${safeVehicle}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:17px;line-height:1.6;color:#a1a1aa;">
                We'll email <span style="color:#22c55e;font-weight:600;">${safeEmail}</span> when VehicleOS is ready for your car.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">
                <a href="${escapeHtml(MARKETING_URL)}" style="color:#71717a;text-decoration:underline;">vehicleos.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};
